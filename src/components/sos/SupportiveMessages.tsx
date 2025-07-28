import { useState, useEffect } from "react";

const supportiveMessages = [
  "Um passo de cada vez.",
  "Você não está sozinho(a).",
  "Isso vai passar.",
  "Eu estou aqui com você.",
  "Respire fundo. Este momento é só seu.",
  "Você está seguro(a) agora.",
  "Você é mais forte do que imagina.",
  "Seu coração já superou tanto e ainda segue firme.",
  "Não precisa ter tudo sob controle agora.",
  "Permita-se sentir sem julgamentos.",
  "Pausa. Só foque no que está ao seu alcance.",
  "Pensamentos são só pensamentos, não fatos.",
  "Você já enfrentou dias piores e venceu.",
  "Lembre-se: você é resiliente.",
  "Nada dura para sempre, nem a ansiedade.",
  "Daqui a pouco, isso vai parecer menor.",
  "Fique aqui, no agora. Só neste instante.",
  "O futuro não existe ainda. Respire.",
  "Eu me importo com você.",
  "Pode desabafar, estou te ouvindo.",
];

const SupportiveMessages = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % supportiveMessages.length);
    }, 3000); // Troca a cada 3 segundos

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