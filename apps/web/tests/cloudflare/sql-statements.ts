const countKeyword = (line: string, keyword: "CASE" | "END") =>
  Array.from(line.matchAll(new RegExp(`\\b${keyword}\\b`, "gi"))).length;

export const splitD1MigrationStatements = (sql: string): string[] => {
  const statements: string[] = [];
  let current: string[] = [];
  let inTrigger = false;
  let triggerCaseDepth = 0;

  const flush = () => {
    const statement = current.join("\n").trim();
    if (statement.length > 0) statements.push(statement);
    current = [];
  };

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("--")) continue;

    if (!inTrigger && /^CREATE\s+TRIGGER\b/i.test(trimmed)) {
      inTrigger = true;
      triggerCaseDepth = 0;
    }

    current.push(line);

    if (inTrigger) {
      if (/^END;\s*$/i.test(trimmed)) {
        if (triggerCaseDepth > 0) {
          triggerCaseDepth -= 1;
        } else {
          flush();
          inTrigger = false;
        }
        continue;
      }

      triggerCaseDepth += countKeyword(trimmed, "CASE") - countKeyword(trimmed, "END");
      if (triggerCaseDepth < 0) triggerCaseDepth = 0;
      continue;
    }

    if (/;\s*$/.test(trimmed)) flush();
  }

  flush();
  return statements;
};
