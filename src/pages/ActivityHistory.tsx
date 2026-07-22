import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Download, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuarterlyActivities } from "@/hooks/useQuarterlyActivities";
import { formatDateTime } from "@/utils/dateFormatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonSectionCard } from "@/components/skeletons/Skeletons";
import jsPDF from 'jspdf';

const ActivityHistory = () => {
  const navigate = useNavigate();
  const { quarterlyActivities, loading } = useQuarterlyActivities();
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
      return monthKey === selectedMonth;
    });
  }, [quarterlyActivities, selectedMonth]);

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

  // Export to CSV
  const exportToCSV = () => {
    if (filteredActivities.length === 0) return;

    const csvContent = [
      ['Atividade', 'Data', 'Hora'].join(','),
      ...filteredActivities.map(activity => {
        const date = new Date(activity.date);
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return [activity.name, dateStr, timeStr].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `atividades-${selectedMonth}.csv`;
    link.click();
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredActivities.length === 0) return;

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
      
      doc.text(`${index + 1}. ${activity.name}`, 20, yPos);
      doc.text(`${dateStr} às ${timeStr}`, 30, yPos + 5);
      yPos += 15;
    });
    
    doc.save(`atividades-${selectedMonth}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/statistics')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Histórico de Atividades</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {loading ? (
          <SkeletonSectionCard rows={6} accent="primary" />
        ) : availableMonths.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma atividade registrada nos últimos 3 meses
          </div>
        ) : (
          <>
            {/* Month Filter and Export Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtrar por Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedMonth} onValueChange={(value) => {
                  setSelectedMonth(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
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

                <div className="flex gap-2">
                  <Button 
                    onClick={exportToPDF} 
                    disabled={filteredActivities.length === 0}
                    className="flex-1"
                    variant="outline"
                  >
                    <FileText size={16} className="mr-2" />
                    Exportar PDF
                  </Button>
                  <Button 
                    onClick={exportToCSV} 
                    disabled={filteredActivities.length === 0}
                    className="flex-1"
                    variant="outline"
                  >
                    <Download size={16} className="mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activities List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-primary" size={20} />
                  Atividades - {formatMonthDisplay(selectedMonth)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma atividade neste mês
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedActivities.map((activity, index) => {
                        const date = new Date(activity.date);
                        return (
                          <div
                            key={index}
                            className="flex flex-col gap-2 p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent"
                          >
                            <div className="flex items-start justify-between">
                              <p className="font-semibold text-base">{activity.name}</p>
                              <span className="text-sm font-medium text-primary flex items-center gap-1">
                                <Clock size={14} />
                                {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar size={12} />
                              {formatDateTime(activity.date)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;