import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Download, FileText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { FEED_FILTERS, type FeedCategory } from "@/lib/activityFeed";
import FeedList from "@/components/progress/FeedList";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/dateFormatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonSectionCard } from "@/components/skeletons/Skeletons";
import { SosHistoryPanel } from "@/components/sos/SosHistoryPanel";
import { useAuth } from "@/contexts/AuthContext";
import PatientBottomNav from "@/components/PatientBottomNav";

const ActivityHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: quarterlyActivities, loading } = useActivityFeed();
  const [category, setCategory] = useState<'all' | FeedCategory>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get available months from activities
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    quarterlyActivities.forEach(activity => {
      const date = new Date(activity.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [quarterlyActivities]);

  // Set initial month if not selected
  if (!selectedMonth && availableMonths.length > 0) {
    setSelectedMonth(availableMonths[0]);
  }

  // Filter activities by selected month
  const filteredActivities = useMemo(() => {
    if (!selectedMonth) return [];
    
    return quarterlyActivities.filter(activity => {
      const date = new Date(activity.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth && (category === 'all' || activity.category === category);
    });
  }, [quarterlyActivities, selectedMonth, category]);

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredActivities, currentPage]);

  // Format month for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Escape a field for CSV: wrap in quotes (doubling any internal quotes)
  // whenever it contains a comma, quote or newline — activity names like
  // "Sons Terapêuticos: Chuva, Trovão" would otherwise split into extra
  // columns and corrupt the row.
  const escapeCSVField = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredActivities.length === 0) return;

    const csvContent = [
      ['Atividade', 'Detalhe', 'Data', 'Hora'].join(','),
      ...filteredActivities.map(activity => {
        const date = new Date(activity.date);
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return [escapeCSVField(activity.name), escapeCSVField(activity.detail ?? ''), dateStr, timeStr].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `atividades-${selectedMonth}.csv`;
    link.click();
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (filteredActivities.length === 0) return;

    // Carregada só ao exportar: a biblioteca de PDF pesa ~600 KB.
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Histórico de Atividades', 20, 20);
    
    // Month
    doc.setFontSize(12);
    doc.text(`Período: ${formatMonthDisplay(selectedMonth)}`, 20, 30);
    
    // Activities
    let yPos = 45;
    doc.setFontSize(10);
    
    filteredActivities.forEach((activity, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      
      const date = new Date(activity.date);
      const dateStr = date.toLocaleDateString('pt-BR');
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      doc.text(`${index + 1}. ${activity.name}${activity.detail ? ` (${activity.detail})` : ''}`, 20, yPos);
      doc.text(`${dateStr} às ${timeStr}`, 30, yPos + 5);
      yPos += 15;
    });
    
    doc.save(`atividades-${selectedMonth}.pdf`);
  };

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader title="Histórico completo" backTo="/statistics" />
        </div>

        <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
          {loading ? (
            <SkeletonSectionCard rows={6} accent="primary" />
          ) : availableMonths.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma atividade registrada nos últimos 3 meses.</p>
          ) : (
            <>
              {/* Filtros: mês e tipo */}
              <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-label="Filtros">
                <Select
                  value={selectedMonth}
                  onValueChange={(value) => {
                    setSelectedMonth(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl" aria-label="Mês">
                    <SelectValue placeholder="Selecione um mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthDisplay(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Tipo">
                  {FEED_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      aria-pressed={category === filter.key}
                      onClick={() => {
                        setCategory(filter.key);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        'min-h-10 rounded-full border px-3 text-sm transition-colors',
                        category === filter.key ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-foreground hover:bg-muted/50',
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Lista */}
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm" aria-labelledby="history-title">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id="history-title" className="text-base font-semibold text-foreground">
                      {formatMonthDisplay(selectedMonth).replace(/^./, (c) => c.toUpperCase())}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {filteredActivities.length} {filteredActivities.length === 1 ? 'registro' : 'registros'}
                    </p>
                  </div>
                </div>

                {filteredActivities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nada deste tipo neste mês.</p>
                ) : (
                  <>
                    <FeedList items={paginatedActivities} />
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                  <Button onClick={exportToPDF} disabled={filteredActivities.length === 0} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Exportar PDF
                  </Button>
                  <Button onClick={exportToCSV} disabled={filteredActivities.length === 0} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar CSV
                  </Button>
                </div>
              </section>
            </>
          )}

          <SosHistoryPanel patientId={user?.id ?? null} title="Minhas solicitações SOS" />
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default ActivityHistory;