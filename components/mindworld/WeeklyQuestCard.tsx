import React from 'react';
import QuestCard from './QuestCard';
import { Id } from '../../convex/_generated/dataModel';

export default function WeeklyQuestCard({ userId }: { userId: Id<"users"> }) {
  return <QuestCard userId={userId} type="weekly" />;
}

