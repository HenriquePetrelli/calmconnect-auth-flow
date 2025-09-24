import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen } from 'lucide-react';
import { usePrivateJournal, JournalEntry } from '@/hooks/usePrivateJournal';
import JournalEntryCard from '@/components/journal/JournalEntryCard';
import JournalEntryModal from '@/components/journal/JournalEntryModal';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNavigation from '@/components/BottomNavigation';
import BackButton from '@/components/BackButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊', '😄'];
const moodLabels = ['Muito triste', 'Triste', 'Neutro', 'Bem', 'Feliz', 'Muito feliz'];

const PrivateJournal = () => {
  const { entries, loading, fetchEntries, addEntry, updateEntry, deleteEntry } = usePrivateJournal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<number | undefined>(undefined);

  const handleSave = async (texto: string, humor: number): Promise<boolean> => {
    if (editingEntry) {
      return await updateEntry(editingEntry.id, texto, humor);
    } else {
      return await addEntry(texto, humor);
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteEntryId(id);
  };

  const confirmDelete = async () => {
    if (deleteEntryId) {
      await deleteEntry(deleteEntryId);
      setDeleteEntryId(null);
    }
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleMoodFilter = (mood: number | undefined) => {
    setMoodFilter(mood);
    fetchEntries(mood);
  };

  const filteredEntries = entries;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/home" label="Home" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Diário Privado</h1>
          </div>
          <p className="text-muted-foreground">
            Seu espaço pessoal para refletir e registrar seus pensamentos
          </p>
        </div>

        {/* Mood Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtrar por Humor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={moodFilter === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => handleMoodFilter(undefined)}
              >
                Todos
              </Button>
              {moodEmojis.map((emoji, index) => (
                <Button
                  key={index}
                  variant={moodFilter === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMoodFilter(index)}
                  className="flex items-center gap-1"
                >
                  <span>{emoji}</span>
                  <span className="hidden sm:inline text-xs">{moodLabels[index]}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add New Entry Button */}
        <Button
          onClick={handleNewEntry}
          className="w-full h-12 text-base font-medium"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Entrada
        </Button>

        {/* Entries List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  {moodFilter !== undefined
                    ? `Nenhuma entrada encontrada para ${moodLabels[moodFilter].toLowerCase()}`
                    : 'Nenhuma entrada no seu diário ainda'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {moodFilter !== undefined
                    ? 'Experimente outros filtros ou crie uma nova entrada'
                    : 'Comece escrevendo seus pensamentos e sentimentos'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <BottomNavigation />

      {/* Add/Edit Entry Modal */}
      <JournalEntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        entry={editingEntry}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrada do seu diário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PrivateJournal;