// Pure layout planner for Profile streak heatmap

export const CELL_SIZE = 13;
export const CELL_GAP = 3;
export const WEEK_PITCH = CELL_SIZE + CELL_GAP; // 16

export const WEEKDAY_COL_WIDTH = 34;
export const WEEKDAY_GUTTER = 4;

export const MONTH_LABEL_MIN_CLEARANCE_PX = 24;
export const LABEL_ROW_HEIGHT = 14;
export const GRID_TAIL_PAD = 6;

export function computeMonthLabelPlan(heat: any) {
  const months = (heat && Array.isArray(heat.months)) ? heat.months : [];

  const labels: { label: string; x: number }[] = [];
  const skipped: string[] = [];
  let startWeekIndex = 0;
  let lastRenderedX: number | null = null;

  for (const group of months) {
    const x = WEEKDAY_COL_WIDTH + WEEKDAY_GUTTER + startWeekIndex * WEEK_PITCH;
    if (lastRenderedX === null || x - lastRenderedX >= MONTH_LABEL_MIN_CLEARANCE_PX) {
      labels.push({ label: group.label, x });
      lastRenderedX = x;
    } else {
      skipped.push(group.label);
    }
    startWeekIndex += group.weeks.length;
  }

  return { labels, skipped };
}

export function computeContentWidth(heat: any, includeTailPad: boolean) {
  const months = (heat && Array.isArray(heat.months)) ? heat.months : [];
  const totalWeeks = months.reduce((sum: number, group: any) => sum + group.weeks.length, 0);
  return (
    WEEKDAY_COL_WIDTH +
    WEEKDAY_GUTTER +
    totalWeeks * WEEK_PITCH +
    (includeTailPad ? GRID_TAIL_PAD : 0)
  );
}
