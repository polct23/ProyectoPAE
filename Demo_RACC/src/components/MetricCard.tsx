import React from 'react';
import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  color?: 'red' | 'yellow' | 'blue';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, color = 'red' }) => {
  return (
    <div className={`metric-card metric-card-${color}`}>
      <h3 className="metric-title">{title}</h3>
      <p className="metric-value">{value}</p>
    </div>
  );
};

export default MetricCard;
