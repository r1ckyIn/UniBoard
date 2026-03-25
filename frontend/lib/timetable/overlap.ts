/**
 * Overlap column assignment algorithm.
 * Ported from prototype/timetable.html assignCols().
 *
 * Groups transitively overlapping events, then assigns columns
 * within each group so no two overlapping events share a column.
 */

export interface OverlappableEvent {
  start_hour: number;
  end_hour: number;
  _col?: number;
  _cc?: number;
}

/**
 * Assign column positions (_col) and total column count (_cc) to events.
 * Mutates the input array in-place and returns it.
 *
 * Algorithm:
 * 1. Sort by start_hour, then end_hour
 * 2. Build transitive overlap groups (if event j starts before group's maxEnd)
 * 3. Per group, greedily assign columns (reuse first column whose last event ended)
 * 4. Set _cc = total columns in group for all group members
 */
export function assignCols<T extends OverlappableEvent>(events: T[]): T[] {
  if (events.length === 0) return events;

  events.sort((a, b) => a.start_hour - b.start_hour || a.end_hour - b.end_hour);

  // Build overlap groups
  const visited = new Array<boolean>(events.length);
  const groups: number[][] = [];

  for (let i = 0; i < events.length; i++) {
    if (visited[i]) continue;

    const grp = [i];
    visited[i] = true;
    let maxEnd = events[i].end_hour;

    for (let j = i + 1; j < events.length; j++) {
      if (events[j].start_hour < maxEnd) {
        grp.push(j);
        visited[j] = true;
        if (events[j].end_hour > maxEnd) maxEnd = events[j].end_hour;
      }
    }

    groups.push(grp);
  }

  // Assign columns per group independently
  for (const grp of groups) {
    // cols[c] = end_hour of the last event placed in column c
    const cols: number[] = [];

    for (const idx of grp) {
      const ev = events[idx];
      let placed = false;

      for (let c = 0; c < cols.length; c++) {
        if (ev.start_hour >= cols[c]) {
          cols[c] = ev.end_hour;
          ev._col = c;
          placed = true;
          break;
        }
      }

      if (!placed) {
        ev._col = cols.length;
        cols.push(ev.end_hour);
      }
    }

    const totalCols = cols.length;
    for (const idx of grp) {
      events[idx]._cc = totalCols;
    }
  }

  return events;
}
