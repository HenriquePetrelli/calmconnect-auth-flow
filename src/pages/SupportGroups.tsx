import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Heart, Info, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useSupportGroups, useGroupSymptoms } from '@/hooks/useSupportGroups';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import BottomNavigation from '@/components/BottomNavigation';
import BackButton from '@/components/BackButton';

interface GroupCardProps {
  group: {
    id: string;
    nome: string;
    descricao: string;
    is_favorited?: boolean;
  };
  onToggleFavorite: (groupId: string) => void;
  onViewGroup: (groupId: string, groupName: string) => void;
}

const GroupCard = ({ group, onToggleFavorite, onViewGroup }: GroupCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { symptoms, loading: symptomsLoading } = useGroupSymptoms(group.nome);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg leading-tight">
                  {group.nome}
                </CardTitle>
                {group.is_favorited && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Heart className="w-3 h-3 mr-1 fill-current" />
                    Favorito
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {group.descricao}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(group.id)}
                className="h-8 w-8 p-0 hover:bg-primary/10"
              >
                <Heart 
                  className={`w-4 h-4 transition-colors ${
                    group.is_favorited 
                      ? 'text-primary fill-current' 
                      : 'text-muted-foreground hover:text-primary'
                  }`} 
                />
              </Button>
              
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <Button 
            onClick={() => onViewGroup(group.id, group.nome)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Users className="w-4 h-4 mr-2" />
            Ver Depoimentos
          </Button>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <h4 className="text-sm font-medium text-foreground">
                Sintomas relacionados
              </h4>
            </div>
            
            {symptomsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : symptoms.length > 0 ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                {symptoms.map((symptom, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhum sintoma específico cadastrado para este grupo.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const SupportGroups = () => {
  const navigate = useNavigate();
  const { groups, loading, toggleFavorite } = useSupportGroups();

  const handleViewGroup = (groupId: string, groupName: string) => {
    navigate(`/support-group/${groupId}`, { 
      state: { groupName } 
    });
  };

  if (loading) {
    return (
      <div className="has-tabs">
        <div className="screen">
          <main className="container mx-auto px-4 py-6">
            <div className="mb-6">
              <BackButton to="/home" label="Voltar para Home" />
            </div>
              
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-96 mx-auto" />
              </div>
              
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="has-tabs">
      <div className="screen">
        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <BackButton to="/home" label="Voltar para Home" />
          </div>
          
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Grupos de Apoio
              </h1>
              <p className="text-muted-foreground">
                Conecte-se com pessoas que enfrentam desafios similares aos seus
              </p>
            </div>

            {groups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum grupo encontrado
                  </h3>
                  <p className="text-muted-foreground">
                    Os grupos de apoio aparecerão aqui quando estiverem disponíveis.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onToggleFavorite={toggleFavorite}
                    onViewGroup={handleViewGroup}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default SupportGroups;