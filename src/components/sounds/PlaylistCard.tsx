import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface PlaylistCardProps {
  title: string;
  count: string;
  image: string;
  onClick: () => void;
}

const PlaylistCard = ({ title, count, image, onClick }: PlaylistCardProps) => {
  return (
    <Card 
      className="relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] overflow-hidden h-32"
      onClick={onClick}
    >
      <CardContent className="p-0 relative h-full">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover brightness-75"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
          <p className="text-white/90 text-sm">{count}</p>
        </div>
        
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaylistCard;