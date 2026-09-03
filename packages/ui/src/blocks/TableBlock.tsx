/**
 * Page Builder — Table Block.
 *
 * Displays a data table with headers, rows, optional striping and borders.
 *
 * @module packages/ui/src/blocks/TableBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function TableBlock({ block }: BlockComponentProps) {
  const {
    headers = [],
    rows = [],
    striped = true,
    bordered = true,
  } = block.props as {
    headers?: string[];
    rows?: string[][];
    striped?: boolean;
    bordered?: boolean;
  };

  if (headers.length === 0) return null;

  return (
    <div
      className="wb-block-table wb-data-table-wrap"
      style={{
        overflowX: 'auto',
        border: bordered ? '1px solid var(--border-subtle)' : 'none',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <table
        className="wb-data-table"
        style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="wb-data-table th"
                style={{
                  padding: 'var(--sp-2) var(--sp-3)',
                  textAlign: 'left',
                  fontWeight: 'var(--weight-semibold)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-2)',
                  borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background: striped && ri % 2 === 1 ? 'var(--bg-2)' : 'var(--bg-1)',
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: 'var(--sp-2) var(--sp-3)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
