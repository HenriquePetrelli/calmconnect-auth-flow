import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
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
      <Card 
        className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
        onClick={onClick}
      >
        <CardContent className="p-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background opacity-80" />
          
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg",
                  category.gradient
                )}>
                  {category.icon}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-1">{category.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    {category.sounds} sons
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>
              
              <div className="ml-4">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sounds-primary to-sounds-secondary flex items-center justify-center text-white">
            {category.icon}
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm leading-tight mb-1">
              {category.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {category.count} opções
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryCard;