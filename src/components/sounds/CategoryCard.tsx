import { cn } from "@/lib/utils";

interface Category {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  gradient?: string;
  sounds?: number;
  count?: number;
}

interface CategoryCardProps {
  category: Category;
  type: "main" | "sub";
  onClick: () => void;
}

const CategoryCard = ({ category, type, onClick }: CategoryCardProps) => {
  if (type === "main") {
    return (
      <div 
        className="flex items-center justify-between p-4 cursor-pointer border-b border-border"
        onClick={onClick}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white",
            category.gradient
          )}>
            {category.icon}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-foreground mb-1">{category.title}</h3>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              {category.sounds} sons
            </p>
            <p className="text-sm text-muted-foreground">
              {category.description}
            </p>
          </div>
        </div>
        
        <span className="text-xl text-muted-foreground ml-4">→</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between p-4 cursor-pointer bg-muted/30 rounded-lg"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sounds-primary to-sounds-secondary flex items-center justify-center text-white">
          {category.icon}
        </div>
        <div>
          <h4 className="font-medium text-foreground text-sm mb-1">
            {category.title}
          </h4>
          <p className="text-xs text-muted-foreground">
            {category.count} opções
          </p>
        </div>
      </div>
      <span className="text-lg text-muted-foreground">→</span>
    </div>
  );
};

export default CategoryCard;