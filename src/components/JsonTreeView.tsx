import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  CodeRegular,
  CopyRegular,
  DismissRegular,
  SearchRegular,
  TextBulletListTreeRegular,
} from '@fluentui/react-icons';
import { useCustomScrollbars } from '@axiscommunications/fluent-styles';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  searchInput: {
    flex: 1,
  },
  treeViewport: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    padding: tokens.spacingHorizontalM,
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, Monaco, monospace',
    fontSize: '12.5px',
    lineHeight: '1.55',
  },
  nodeRow: {
    display: 'flex',
    alignItems: ' baseline',
    padding: '1px 4px',
    borderRadius: tokens.borderRadiusSmall,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  toggleBtn: {
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    marginRight: '2px',
    color: tokens.colorNeutralForeground3,
    userSelect: 'none',
    flexShrink: 0,
  },
  spacer: {
    display: 'inline-block',
    width: '18px',
    flexShrink: 0,
  },
  keyName: {
    color: '#9cdcfe',
    marginRight: '4px',
  },
  punctuation: {
    color: tokens.colorNeutralForeground3,
  },
  stringVal: {
    color: '#ce9178',
    wordBreak: 'break-all',
  },
  isoVal: {
    color: '#4ec9b0',
  },
  numberVal: {
    color: '#b5cea8',
  },
  booleanVal: {
    color: '#569cd6',
    fontWeight: 600,
  },
  nullVal: {
    color: '#808080',
    fontStyle: 'italic',
  },
  summaryMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: '11px',
    marginLeft: '6px',
  },
  matchHighlight: {
    backgroundColor: 'rgba(255, 204, 0, 0.32)',
    outline: '1px solid #FFCC00',
    borderRadius: '2px',
  },
  rawPre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: tokens.colorNeutralForeground1,
  },
});

interface TreeNodeProps {
  keyName?: string | number;
  value: unknown;
  path: string;
  depth: number;
  isLast: boolean;
  searchLower: string;
  forceExpandMode: 'default' | 'all' | 'collapsed';
  generation: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function subtreeMatchesSearch(val: unknown, searchLower: string, keyName?: string | number): boolean {
  if (!searchLower) return false;
  if (keyName !== undefined && String(keyName).toLowerCase().includes(searchLower)) {
    return true;
  }
  if (val === null || val === undefined) return false;
  if (typeof val !== 'object') {
    const str = String(val);
    if (str.length > 300) {
      return str.slice(0, 120).toLowerCase().includes(searchLower);
    }
    return str.toLowerCase().includes(searchLower);
  }
  if (Array.isArray(val)) {
    return val.some((item, idx) => subtreeMatchesSearch(item, searchLower, idx));
  }
  return Object.entries(val as Record<string, unknown>).some(([k, v]) =>
    subtreeMatchesSearch(v, searchLower, k)
  );
}

const JsonTreeNode: React.FC<TreeNodeProps> = ({
  keyName,
  value,
  path,
  depth,
  isLast,
  searchLower,
  forceExpandMode,
  generation,
}) => {
  const styles = useStyles();

  const defaultExpanded = useMemo(() => {
    if (forceExpandMode === 'all') return true;
    if (forceExpandMode === 'collapsed') return depth === 0;
    // By default expand root, classes, image, parts, and the first 2 path/observation items
    if (depth <= 1) return true;
    if (
      path.startsWith('$.classes.0') ||
      path.startsWith('$.image') ||
      path.startsWith('$.bounding_box') ||
      path.startsWith('$.parts')
    ) {
      return true;
    }
    if (
      path === '$.path.0' ||
      path === '$.path.1' ||
      path === '$.observations.0' ||
      path === '$.observations.1'
    ) {
      return true;
    }
    return false;
  }, [forceExpandMode, depth, path, generation]);

  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [showFullLongString, setShowFullLongString] = useState<boolean>(false);

  React.useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded, generation]);

  const hasMatchInSubtree = useMemo(
    () => (searchLower ? subtreeMatchesSearch(value, searchLower, keyName) : false),
    [value, searchLower, keyName]
  );

  const isEffectiveExpanded = searchLower && hasMatchInSubtree ? true : expanded;

  const keyDirectMatch =
    searchLower && keyName !== undefined && String(keyName).toLowerCase().includes(searchLower);

  const renderKeyPrefix = () => {
    if (keyName === undefined) return null;
    if (typeof keyName === 'number') {
      return (
        <span className={styles.punctuation} style={{ marginRight: '6px' }}>
          [{keyName}]:
        </span>
      );
    }
    return (
      <>
        <span className={mergeClasses(styles.keyName, keyDirectMatch && styles.matchHighlight)}>
          "{keyName}"
        </span>
        <span className={styles.punctuation} style={{ marginRight: '6px' }}>
          :
        </span>
      </>
    );
  };

  // Object or Array branch
  if (value !== null && typeof value === 'object') {
    const isArray = Array.isArray(value);
    const entries = isArray
      ? (value as unknown[]).map((v, i) => [i, v] as const)
      : Object.entries(value as Record<string, unknown>);
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';
    const isEmpty = entries.length === 0;

    let collapsedHint = isArray ? `${entries.length} items` : `${entries.length} keys`;
    if (!isArray && value && 'timestamp' in (value as Record<string, unknown>)) {
      const ts = (value as Record<string, unknown>).timestamp;
      if (typeof ts === 'string') {
        collapsedHint = `t=${ts.slice(11, 23)}`;
      }
    }

    return (
      <div style={{ paddingLeft: depth > 0 ? '16px' : '0px' }}>
        <div
          className={styles.nodeRow}
          onClick={() => !isEmpty && setExpanded((e) => !e)}
          style={{ cursor: isEmpty ? 'default' : 'pointer' }}
        >
          {isEmpty ? (
            <span className={styles.spacer} />
          ) : (
            <span className={styles.toggleBtn}>
              {isEffectiveExpanded ? (
                <ChevronDownRegular fontSize={12} />
              ) : (
                <ChevronRightRegular fontSize={12} />
              )}
            </span>
          )}
          {renderKeyPrefix()}
          <span className={styles.punctuation}>{openBracket}</span>
          {(!isEffectiveExpanded || isEmpty) && (
            <>
              {!isEmpty && <span className={styles.summaryMeta}>{collapsedHint}</span>}
              <span className={styles.punctuation} style={{ marginLeft: isEmpty ? 0 : '6px' }}>
                {closeBracket}
                {!isLast ? ',' : ''}
              </span>
            </>
          )}
        </div>

        {isEffectiveExpanded && !isEmpty && (
          <div>
            {entries.map(([k, v], idx) => (
              <JsonTreeNode
                key={String(k)}
                keyName={k}
                value={v}
                path={`${path}.${k}`}
                depth={depth + 1}
                isLast={idx === entries.length - 1}
                searchLower={searchLower}
                forceExpandMode={forceExpandMode}
                generation={generation}
              />
            ))}
            <div style={{ paddingLeft: '18px' }} className={styles.punctuation}>
              {closeBracket}
              {!isLast ? ',' : ''}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Primitive leaf node
  const valStr = String(value);
  const valDirectMatch =
    searchLower && valStr.length <= 300 && valStr.toLowerCase().includes(searchLower);

  let renderedValue: React.ReactNode;
  if (typeof value === 'string') {
    const isLongBase64 = value.length > 180;
    if (isLongBase64 && !showFullLongString) {
      const kb = ((value.length * 3) / 4 / 1024).toFixed(1);
      renderedValue = (
        <span>
          <span className={styles.stringVal}>"{value.slice(0, 36)}…"</span>{' '}
          <Badge
            appearance="tint"
            color="brand"
            size="small"
            style={{ cursor: 'pointer', verticalAlign: 'middle' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowFullLongString(true);
            }}
          >
            base64 ({kb} KB) — Expand
          </Badge>
        </span>
      );
    } else if (isLongBase64 && showFullLongString) {
      renderedValue = (
        <span>
          <span className={styles.stringVal}>"{value}"</span>{' '}
          <Badge
            appearance="outline"
            size="small"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowFullLongString(false);
            }}
          >
            Collapse base64
          </Badge>
        </span>
      );
    } else if (ISO_DATE_RE.test(value)) {
      renderedValue = (
        <span className={mergeClasses(styles.isoVal, valDirectMatch && styles.matchHighlight)}>
          "{value}"
        </span>
      );
    } else {
      renderedValue = (
        <span className={mergeClasses(styles.stringVal, valDirectMatch && styles.matchHighlight)}>
          "{value}"
        </span>
      );
    }
  } else if (typeof value === 'number') {
    renderedValue = (
      <span className={mergeClasses(styles.numberVal, valDirectMatch && styles.matchHighlight)}>
        {value}
      </span>
    );
  } else if (typeof value === 'boolean') {
    renderedValue = (
      <span className={mergeClasses(styles.booleanVal, valDirectMatch && styles.matchHighlight)}>
        {String(value)}
      </span>
    );
  } else {
    renderedValue = <span className={styles.nullVal}>null</span>;
  }

  return (
    <div style={{ paddingLeft: depth > 0 ? '16px' : '0px' }}>
      <div className={styles.nodeRow}>
        <span className={styles.spacer} />
        {renderKeyPrefix()}
        {renderedValue}
        <span className={styles.punctuation}>{!isLast ? ',' : ''}</span>
      </div>
    </div>
  );
};

export interface JsonTreeViewProps {
  data: unknown;
  trackId: string;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, trackId }) => {
  const styles = useStyles();
  const scrollStyles = useCustomScrollbars();

  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [forceExpandMode, setForceExpandMode] = useState<'default' | 'all' | 'collapsed'>(
    'default'
  );
  const [generation, setGeneration] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    setForceExpandMode('default');
    setGeneration((g) => g + 1);
  }, [trackId]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.titleRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TextBulletListTreeRegular />
            <Text weight="semibold">Object Track JSON</Text>
            <Badge appearance="outline" size="small">
              object_track.v1
            </Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button
              size="small"
              appearance={viewMode === 'tree' ? 'secondary' : 'subtle'}
              icon={<TextBulletListTreeRegular />}
              onClick={() => setViewMode('tree')}
            >
              Tree
            </Button>
            <Button
              size="small"
              appearance={viewMode === 'raw' ? 'secondary' : 'subtle'}
              icon={<CodeRegular />}
              onClick={() => setViewMode('raw')}
            >
              Raw
            </Button>
            <Tooltip content="Copy full JSON payload to clipboard" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<CopyRegular />}
                onClick={handleCopyJson}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Tooltip>
          </div>
        </div>

        {viewMode === 'tree' && (
          <div className={styles.controlsRow}>
            <Input
              className={styles.searchInput}
              size="small"
              contentBefore={<SearchRegular />}
              contentAfter={
                search ? (
                  <Button
                    size="small"
                    appearance="transparent"
                    icon={<DismissRegular />}
                    onClick={() => setSearch('')}
                  />
                ) : undefined
              }
              placeholder="Search JSON keys or values..."
              value={search}
              onChange={(_, d) => setSearch(d.value)}
            />
            <Button
              size="small"
              appearance="subtle"
              onClick={() => {
                setForceExpandMode('all');
                setGeneration((g) => g + 1);
              }}
            >
              Expand All
            </Button>
            <Button
              size="small"
              appearance="subtle"
              onClick={() => {
                setForceExpandMode('collapsed');
                setGeneration((g) => g + 1);
              }}
            >
              Collapse
            </Button>
          </div>
        )}
      </div>

      <div className={mergeClasses(styles.treeViewport, scrollStyles.scrollable)}>
        {viewMode === 'tree' ? (
          <JsonTreeNode
            value={data}
            path="$"
            depth={0}
            isLast={true}
            searchLower={search.trim().toLowerCase()}
            forceExpandMode={forceExpandMode}
            generation={generation}
          />
        ) : (
          <pre className={styles.rawPre}>{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};
