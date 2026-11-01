/**
 * Page Builder — Table Block.
 *
 * Displays a data table on the shared `.wb-data-table` brick.
 *
 * @module packages/ui/src/blocks/TableBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function TableBlock({ block }: BlockComponentProps) {
  const { headers = [], rows = [] } = block.props as {
    headers?: string[];
    rows?: string[][];
  };

  if (headers.length === 0) return null;

  return (
    <div className="wb-block-table">
      <table className="wb-data-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
