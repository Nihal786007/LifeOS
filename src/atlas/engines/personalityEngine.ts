// ==========================================
// LifeOS ATLAS Personality Engine
// Version: 2.0
// ==========================================

export class PersonalityEngine {
  greeting(
    completedTasks: number,
    totalTasks: number,
    completionRate: number
  ): string {

    const hour = new Date().getHours();

    let greeting = "";

    if (hour < 12) {
      greeting = "🌅 Good Morning";
    } else if (hour < 18) {
      greeting = "☀️ Good Afternoon";
    } else {
      greeting = "🌙 Good Evening";
    }

    if (totalTasks === 0) {
      return `${greeting}. Your mission board is empty. Let's plan an awesome day.`;
    }

    if (completionRate >= 80) {
      return `${greeting}. Outstanding work! You've completed ${completedTasks}/${totalTasks} missions.`;
    }

    if (completionRate >= 50) {
      return `${greeting}. You're making steady progress (${completedTasks}/${totalTasks} missions completed).`;
    }

    return `${greeting}. Mission progress is ${completedTasks}/${totalTasks}. Let's regain momentum.`;
  }

  motivation(): string {
    const quotes = [
      "One mission at a time.",
      "Progress beats perfection.",
      "Every task completed shapes your future.",
      "Stay disciplined. Greatness is built daily.",
      "Focus today. Lead tomorrow.",
      "Small wins create extraordinary futures.",
      "Consistency is your greatest superpower.",
      "Mission accepted. Let's build something amazing.",
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}