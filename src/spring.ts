export const springDays = 6;
export const dailyMinutes = 360;

export class Spring {
  day = 1;
  seeds = { turnip: 2, squash: 2 };
  get ended() {
    return this.day > springDays;
  }
  rest() {
    if (!this.ended) this.day++;
  }
}
