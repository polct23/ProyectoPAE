
import React, { useEffect, useState } from 'react';
import './Informe.css';
import { WeeklyChart } from '../components/Charts';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const Informe: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [csvDisponible, setCsvDisponible] = useState(true);
  useEffect(() => {
    fetch('http://localhost:8000/api/informe/datos')
      .then(res => res.json())
      .then(data => {
        if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
          setCsvDisponible(false);
          setRows([]);
        } else {
          setRows(data.rows);
          setCsvDisponible(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setCsvDisponible(false);
        setRows([]);
        setLoading(false);
      });
  }, []);


  // 1. Gràfica circular: incidències per dia de la setmana
  const dayCounts: Record<string, number> = {};
  rows.forEach(row => {
    const day = row['Dia de la setmana'] || row['Dia setmana'] || row['dia de la setmana'] || row['dia setmana'] || 'Desconegut';
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const pieDayData = Object.entries(dayCounts).map(([name, value]) => ({ name, value }));

  // 2. Gràfica circular: incidències per tipus (agrupación robusta y soporte de comillas especiales)
  const typeCounts: Record<string, number> = {};
  // Detectar la clave real del campo de tipus (puede tener comillas simples, dobles o especiales)
  const tipusKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase().replace(/[’‘`´']/g, "'").includes("tipus d'incidència".replace(/[’‘`´']/g, "'"))) || '';
  const normalizeType = (raw: string) => {
    // Normaliza comillas y acentos raros
    let t = (raw || '').toLowerCase()
      .replace(/[’‘`´']/g, "'")
      .replace(/[^a-zàèéíòóúüç\s']/gi, '')
      .replace(/\s+/g, ' ').trim();
    if (t.includes('accident')) return 'Accident';
    if (t.includes('retenció') || t.includes('retencio')) return 'Retenció';
    if (t.includes('avaria') || t.includes('vehicle avariat')) return 'Avaria';
    if (!t || t === '-' || t === 'desconegut') return 'Desconegut';
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  rows.forEach(row => {
    let tipus = '';
    if (tipusKey) tipus = row[tipusKey];
    tipus = normalizeType(String(tipus));
    typeCounts[tipus] = (typeCounts[tipus] || 0) + 1;
  });
  const pieTypeData = Object.entries(typeCounts)
    .filter(([name, _]) => name !== 'Desconegut' || Object.keys(typeCounts).length === 1)
    .map(([name, value]) => ({ name, value }));

  // 3. Gràfica de barres: incidències per carretera (varias vies separades per ';')
  const roadCounts: Record<string, number> = {};
  rows.forEach(row => {
    let vias = row['Carretera'] || row['Vies'] || row['Via'] || row['carretera'] || row['vies'] || row['via'] || '';
    if (vias) {
      String(vias).split(';').forEach(via => {
        const v = via.trim();
        if (v) roadCounts[v] = (roadCounts[v] || 0) + 1;
      });
    }
  });
  const barRoadData = Object.entries(roadCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);

  // Colors per a les gràfiques
  // Paleta de colores oscuros y contrastados (sin amarillos ni blancos)
  const COLORS = [
    '#1976D2', // azul oscuro
    '#388E3C', // verde oscuro
    '#D32F2F', // rojo oscuro
    '#7B1FA2', // morado
    '#F57C00', // naranja fuerte
    '#455A64', // gris azulado
    '#0288D1', // azul medio
    '#388E3C', // verde
    '#C2185B', // rosa oscuro
    '#512DA8', // violeta
    '#303F9F', // azul profundo
    '#5D4037', // marrón
  ];

  const downloadPDF = async () => {
    // Primera página: título, fecha, logo, gráficas proporcionadas
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    // Fecha arriba izq
    const fecha = new Date().toLocaleDateString('ca-ES');
    doc.setFontSize(11);
    doc.text(fecha, 10, 12);
    // Logo arriba der
    const logoUrl = '/racc.png';
    try {
      const img = new window.Image();
      img.src = logoUrl;
      await new Promise(resolve => { img.onload = resolve; });
      doc.addImage(img, 'PNG', pageWidth - 40, 5, 30, 30);
    } catch {}
    // Título centrado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("Informe d'incidències setmanal", pageWidth / 2, 25, { align: 'center' });
    let y = 38;
    // Gráficas: capturarlas como imágenes, proporción adecuada y fuente grande
    const chartBoxes = document.querySelectorAll('.chart-box');
    // Pie charts: 50% ancho, centradas. Bar chart: 70% ancho.
    for (let i = 0; i < chartBoxes.length; i++) {
      const chartElem = chartBoxes[i] as HTMLElement;
      if (chartElem) {
        chartElem.classList.add('pdf-export');
        const canvas = await html2canvas(chartElem, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');
        let chartW, chartH, chartX;
        if (i < 2) { // Pie charts
          chartW = pageWidth * 0.4;
          chartH = 60;
        } else { // Bar chart
          chartW = pageWidth * 0.7;
          chartH = 60;
        }
        chartX = (pageWidth - chartW) / 2;
        // Fondo gris claro y borde gris oscuro
        doc.setFillColor(240,240,240);
        doc.setDrawColor(80,80,80);
        doc.roundedRect(chartX-4, y-4, chartW+8, chartH+8, 4, 4, 'FD');
        // Gráfica
        doc.addImage(imgData, 'PNG', chartX, y, chartW, chartH);
        chartElem.classList.remove('pdf-export');
        y += chartH + 16;
      }
    }
    // Segunda página: tabla en horizontal, usando jsPDF autotable
    doc.addPage('a4', 'landscape');
    const pageW2 = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.text('Dades detallades', pageW2 / 2, 12, { align: 'center' });
    // Extraer cabeceras y filas de la tabla
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const data = rows.map(row => headers.map(h => String(row[h] ?? '')));
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 18,
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 250, 255] },
        margin: { left: 10, right: 10 },
        tableWidth: 'auto',
        pageBreak: 'auto',
      });
    }
    doc.save('informe-setmanal.pdf');
  };

  return (
    <div className="page-informe">
      {/* El título principal (el amarillo) lo deja el layout, así que quitamos el duplicado y el texto extra */}
      {csvDisponible && (
        <div className="report-actions-right">
          <button onClick={downloadPDF}>
            Descarregar informe setmanal en format PDF
          </button>
        </div>
      )}

      {loading ? <div>Cargando...</div> : (
        !csvDisponible ? (
          <div className="no-csv-msg">Informe setmanal no disponible</div>
        ) : (
          <>
            <div className="charts-flex">
              <div className="chart-box">
                <h3>Incidència per dia de la setmana</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={pieDayData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                      {pieDayData.map((entry, idx) => (
                        <Cell key={`cell-day-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <RechartsLegend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-box">
                <h3>Incidència per tipus</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={pieTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                      {pieTypeData.map((entry, idx) => (
                        <Cell key={`cell-type-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <RechartsLegend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-box" style={{ minWidth: 350, flex: 2 }}>
                <h3>Incidència per carretera</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barRoadData} margin={{ left: 10, right: 10, top: 30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#4a90e2">
                      {barRoadData.map((entry, idx) => (
                        <Cell key={`cell-road-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <h3>Dades</h3>
            <div className="table-scroll">
              <table className="colorful-table">
                <thead>
                  <tr>
                    {rows[0] && Object.keys(rows[0]).map(key => <th key={key}>{key}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => <td key={j}>{String(val)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default Informe;