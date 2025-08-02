interface PlaylistCardProps {
  title: string;
  count: string;
  onClick: () => void;
}

const PlaylistCard = ({ title, count, onClick }: PlaylistCardProps) => {
  return (
    <div 
      className="flex items-center justify-between p-4 cursor-pointer bg-muted/30 rounded-lg"
      onClick={onClick}
    >
      <div>
        <h4 className="font-medium text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{count}</p>
      </div>
      <span className="text-lg text-muted-foreground">→</span>
    </div>
  );
};

export default PlaylistCard;