import { SeverityLevel } from '../types';

export interface SeverityConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  examples: string[];
}

export const SEVERITY_LEVELS: Record<SeverityLevel, SeverityConfig> = {
  1: {
    label: 'Minor',
    description: 'Small annoyance, easily forgettable',
    color: '#10B981', // green
    icon: '🔥',
    examples: ['Forgot to reply to text', 'Minor rudeness', 'Small inconvenience']
  },
  2: {
    label: 'Moderate',
    description: 'Noticeable offense, somewhat hurtful',
    color: '#F59E0B', // yellow
    icon: '🔥🔥',
    examples: ['Broke a promise', 'Public embarrassment', 'Inconsiderate behavior']
  },
  3: {
    label: 'Significant',
    description: 'Serious offense, damaged trust',
    color: '#F97316', // orange
    icon: '🔥🔥🔥',
    examples: ['Betrayed confidence', 'Intentional harm', 'Repeated offense']
  },
  4: {
    label: 'Severe',
    description: 'Major betrayal, relationship in jeopardy',
    color: '#EF4444', // red
    icon: '🔥🔥🔥🔥',
    examples: ['Major betrayal', 'Deliberate sabotage', 'Significant harm']
  },
  5: {
    label: 'Unforgivable',
    description: 'Relationship-ending offense',
    color: '#991B1B', // dark red
    icon: '🔥🔥🔥🔥🔥',
    examples: ['Ultimate betrayal', 'Irreparable harm', 'Complete violation of trust']
  }
} as const;
