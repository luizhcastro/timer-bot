type TimeOperator = Record<string, number>;

const timeOperators: TimeOperator = {
  m: 60000,
  min: 60000,
  h: 3600000,
  hr: 3600000,
  s: 1000,
  sec: 1000,
};

export function parseTimerString(timer: string): number {
  let finalTime = 0;
  const parts = timer.split(' ');

  for (const part of parts) {
    const match = part.match(/^(\d+)([a-z]+)$/i);

    if (match) {
      const numericValue = parseInt(match[1]);
      const operator = match[2].toLowerCase();

      if (timeOperators[operator]) {
        const timeToAdd = numericValue * timeOperators[operator];
        finalTime += timeToAdd;
      }
    }
  }

  return finalTime;
}
