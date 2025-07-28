import { useState, useEffect } from "react";

const supportiveMessages = [
  "Um passo de cada vez.",
  "Você não está sozinho(a).",
  "Isso vai passar.",
  "Eu estou aqui com você.",
  "Você é mais forte do que imagina.",
  "Respire. Você consegue.",
  "Cada momento difícil é temporário.",
  "Você merece ajuda e cuidado.",
  "Sua coragem em buscar ajuda é admirável.",
  "Tudo bem não estar bem.",
];

const SupportiveMessages = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % supportiveMessages.length);
    }, 10000); // Troca a cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center p-4">
      <p 
        key={currentMessageIndex}
        className="text-lg text-muted-foreground animate-fade-in font-medium italic"
      >
        "{supportiveMessages[currentMessageIndex]}"
      </p>
    </div>
  );
};

export default SupportiveMessages;