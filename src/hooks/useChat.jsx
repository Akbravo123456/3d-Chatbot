import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestPayload, setRequestPayload] = useState(""); // Store the request payload
  const [response, setResponse] = useState(""); // Store the response

  const chat = async (inputMessage) => {
    setLoading(true);
    setResponse(""); // Clear the previous response when starting a new chat

    try {
      const payload = {
        model: "gemma:latest",
        prompt: inputMessage,
        stream: false,
      };

      // Save the request payload for display
      setRequestPayload(JSON.stringify(payload, null, 2));

      // Make the API request
      const response = await axios.post("http://localhost:11434/api/generate", payload);

      if (response.status === 200) {
        setResponse(response.data.response); // Set the response from API
      } else {
        setResponse("Failed to fetch response");
      }
    } catch (error) {
      console.error("Error fetching data from API", error);
      setResponse("Error fetching data from API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        loading,
        requestPayload,
        response,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};