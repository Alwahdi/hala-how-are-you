export async function collectPages<T>(read: (offset: number) => Promise<{ rows: T[]; total: number }>, size = 100): Promise<T[]> {
  const result: T[] = [];
  let expected: number | undefined;
  do {
    const { rows, total } = await read(result.length);
    if (expected !== undefined && expected !== total) throw Error("count_changed");
    expected = total;
    if (rows.length > size || result.length + rows.length > total || (!rows.length && result.length < total)) throw Error("incomplete_read");
    result.push(...rows);
  } while (result.length < (expected ?? 0));
  return result;
}