import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSpeechSynthesis } from "react-speech-kit";

// Viseme mappings for common phonemes
const visemeMappings = {
  A: "viseme_AA",
  B: "viseme_PP",
  C: "viseme_I",
  D: "viseme_O",
  E: "viseme_E",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP", // Default closed mouth
};

// Talking morph target values
const talking = {
  default: {},
  talk: {
    mouthFunnel: 0.388,
    mouthClose: 0.129,
  },
};

export const Avatar = React.forwardRef((props, ref) => {
  const { nodes, materials, scene } = useGLTF("/models/64f1a714fe61576b46f27ca2.glb");
  const { animations } = useGLTF("/models/animations.glb");
  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);

  const [animation, setAnimation] = useState("Idle");
  const [lipsync, setLipsync] = useState();
  const { speak } = useSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play();
    return () => actions[animation].fadeOut(0.5);
  }, [animation]);

  React.useImperativeHandle(ref, () => ({
    setAnimation: (newAnimation) => setAnimation(newAnimation),
    setLipsync: (newLipsync) => setLipsync(newLipsync),
    triggerSpeech: (text) => {
      const wordList = text.split(" ");
      setWords(wordList);
      setCurrentWordIndex(0);
      speakNextWord(wordList); // Start speaking the first word
    },
  }));

  const speakNextWord = (wordList) => {
    if (currentWordIndex < wordList.length) {
      const word = wordList[currentWordIndex];
      speak({
        text: word,
        onStart: () => {
          setSpeaking(true);
          setAnimation(animations[0].name); // Set animation to the first animation in the list
          simulateViseme(word); // Trigger viseme simulation for the current word
        },
        onEnd: () => {
          setSpeaking(false);
          setCurrentWordIndex((prevIndex) => prevIndex + 1); // Move to the next word
          // Close the viseme (mouth) after speech ends for each word
          setLipsync({ mouthCues: [{ value: "X" }] });
          speakNextWord(wordList); // Speak the next word
        },
      });
    } else {
      setSpeaking(false); // Reset speaking state when done
    }
  };

  // Enhanced function to set specific viseme values based on word content
  const simulateViseme = (word) => {
    const phonemeMapping = [
      { phoneme: /[aeiou]/i, viseme: "A" },   // Map vowels to "A"
      { phoneme: /p|b|m/i, viseme: "B" },      // Map bilabials to "B"
      { phoneme: /f|v/i, viseme: "F" },        // Map labiodentals to "F"
      { phoneme: /t|d|s|z/i, viseme: "D" },    // Map alveolars to "D"
      { phoneme: /k|g/i, viseme: "G" },        // Map velars to "G"
      { phoneme: /l/i, viseme: "C" },          // Map lateral sounds to "C"
      { phoneme: /o/i, viseme: "O" },          // Map rounded vowels to "O"
      { phoneme: /u/i, viseme: "U" },          // Map close back vowels to "U"
      // Additional mappings as needed
    ];

    const matchedViseme = phonemeMapping.find(({ phoneme }) => phoneme.test(word));
    const viseme = matchedViseme ? matchedViseme.viseme : "X"; // Default to closed lips

    setLipsync({ mouthCues: [{ value: viseme }] });
  };

  const lerpMorphTarget = (target, value, speed = 0.05) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index !== undefined) {
          child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[index],
            value,
            speed
          );
        }
      }
    });
  };

  useEffect(() => {
    if (speaking) {
      // Set the avatar's mouth to "talking" position
      lerpMorphTarget("mouthFunnel", talking.talk.mouthFunnel, 0.1);
      lerpMorphTarget("mouthClose", talking.talk.mouthClose, 0.1);
    } else {
      // Reset to neutral position when not speaking
      lerpMorphTarget("mouthFunnel", 0, 0.1);
      lerpMorphTarget("mouthClose", 0, 0.1);
    }
  }, [speaking]);

  useFrame(() => {
    if (lipsync && lipsync.mouthCues) {
      lipsync.mouthCues.forEach((mouthCue) => {
        const correspondingViseme = visemeMappings[mouthCue.value];
        if (correspondingViseme) {
          lerpMorphTarget(correspondingViseme, 1, 0.05);
        }
      });

      Object.values(visemeMappings).forEach((viseme) => {
        if (!lipsync.mouthCues.some((cue) => visemeMappings[cue.value] === viseme)) {
          lerpMorphTarget(viseme, 0, 0.05);
        }
      });
    }
  });

  useControls("Animation Controls", {
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
});

useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");
