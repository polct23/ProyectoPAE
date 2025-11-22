// ...existing code...
import React from 'react';
import './Factors.css';
import MetricCard from '../components/MetricCard';
import { WeeklyChart } from '../components/Charts';

type Factor = { id: number; name: string; impact: 'Baix' | 'Mitjà' | 'Alt'; description: string };

const FACTORS: Factor[] = [
  { id: 1, name: 'Pluja', impact: 'Mitjà', description: 'Pluja intermitent a Barcelonès i Maresme' },
  { id: 2, name: 'Obres C-32', impact: 'Alt', description: 'Tall d’un carril a la C-32, afectacions matí' },
  { id: 3, name: 'Partit Camp Nou', impact: 'Mitjà', description: 'Trànsit concentrat abans i després del partit' },
  { id: 4, name: 'Fira Barcelona', impact: 'Baix', description: 'Augment de vianants i baix flux rodat al Fòrum' },
];

const Factors: React.FC = () => {
  return (
    <div className="page-factors">
      <h2>Factors externs</h2>

      <div className="factors-top">
        {FACTORS.map(f => (
          <div key={f.id} className={`factor-card factor-${f.impact.toLowerCase()}`}>
            <h4>{f.name}</h4>
            <p>{f.description}</p>
            <div className="impact">Impacte: <strong>{f.impact}</strong></div>
          </div>
        ))}
      </div>

      <div className="factors-visuals">
        <section className="mini-chart">
          <h3>Pluja (última setmana) — impacte estimat</h3>
          <WeeklyChart />
        </section>

        <section className="timeline">
          <h3>Línia de temps (simulada)</h3>
          <ul className="timeline-list">
            <li><strong>08:00</strong> — Inici obres C-32 (carril tallat)</li>
            <li><strong>09:12</strong> — Accident A-7 (resposta en curs)</li>
            <li><strong>17:00</strong> — Partit Camp Nou (previsió congestió)</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Factors;
// ...existing code...