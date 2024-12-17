import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import { useSpeechSynthesis } from "react-speech-kit";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((prevText) => (prevText.length > 2 ? "." : prevText + "."));
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);

  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { response, cameraZoomed } = useChat();
  const { speak } = useSpeechSynthesis();
  const avatarRef = useRef(); // Ref for Avatar
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    // Camera zoom control based on cameraZoomed state
    if (cameraZoomed) {
      cameraControls.current.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
    } else {
      cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
    }
  }, [cameraZoomed]);

  useEffect(() => {
    if (response && !isSpeaking) {
      // Set speaking state to prevent repeated reads
      setIsSpeaking(true);

      // Start speaking the response text
      speak({
        text: response,
        onEnd: () => {
          setIsSpeaking(false); // Speech has finished
        },
      });

      // Generate lipsync data and send it to the Avatar
      const lipsyncData = generateLipsyncData(response);
      avatarRef.current.setLipsync(lipsyncData);

      // Trigger avatar animation based on response
      if (avatarRef.current) {
        const animation = parseResponse(response).animation;
        avatarRef.current.setAnimation(animation);
      }
    }
  }, [response, isSpeaking, speak]);

  // Function to parse the response and extract animation details
  const parseResponse = (response) => {
    // Logic to set animation based on response text
    return {
      animation: "Idle", // Default animation
    };
  };

  // Function to generate lipsync data from response
  const generateLipsyncData = (text) => {
    // Simple dummy implementation: Ideally, use a library to map text to visemes/phonemes
    return {
      mouthCues: text.split("").map((char, idx) => ({
        value: char.toUpperCase(),
        start: idx * 100,  // Just for demo, use actual timings here
      })),
    };
  };

  return (
    <>
      <CameraControls ref={cameraControls} />
      <Environment preset="sunset" />
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <Avatar ref={avatarRef} />
      <ContactShadows opacity={0.7} />
    </>
  );
};
