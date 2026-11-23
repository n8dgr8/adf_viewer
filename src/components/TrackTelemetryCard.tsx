import React, { useMemo, useState } from 'react';
import {
  Badge,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  PulseRegular,
} from '@fluentui/react-icons';
import { NormalizedTrackRecord } from '../types/adf';
import {
  extractTrackColorEntries,
  getClassStrokeColor,
} from './views/adfViewHelpers';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  headerToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  gridBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
  },
  subPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    minWidth: 0,
  },
  subHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    fontSize: '12px',
  },
  probBarBg: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  mono: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
  },
});

export interface TrackTelemetryCardProps {
  track: NormalizedTrackRecord;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TrackTelemetryCard: React.FC<TrackTelemetryCardProps> = ({
  track,
  collapsed,
  onToggleCollapse,
}) => {
  const styles = useStyles();
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = collapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((c) => !c);
  };

  const colorEntries = useMemo(() => extractTrackColorEntries(track), [track]);
  const allClasses = [
    { type: track.primaryClass, confidence: track.primaryConfidence },
    ...track.secondaryClasses,
  ];

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        style={isCollapsed ? { borderBottom: 'none' } : undefined}
      >
        <div
          className={styles.headerToggle}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          onClick={handleToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleCollapse();
            }
          }}
        >
          {isCollapsed ? <ChevronRightRegular /> : <ChevronDownRegular />}
          <PulseRegular />
          <Text weight="semibold">Class & Color Candidates</Text>
          <Badge appearance="tint" color="informative">
            {allClasses.length} {allClasses.length === 1 ? 'class' : 'classes'}
            {colorEntries.length > 0
              ? ` · ${colorEntries.length} ${colorEntries.length === 1 ? 'color' : 'colors'}`
              : ''}
          </Badge>
          {isCollapsed && (
            <Badge appearance="outline" size="small">
              {track.primaryClass} {Math.round(track.primaryConfidence * 100)}%
              {colorEntries[0] ? ` • ${colorEntries[0].name}` : ''}
            </Badge>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className={styles.gridBody}>
          {/* Class Candidates */}
          <div className={styles.subPanel}>
            <div className={styles.subHeader}>
              <Text weight="semibold" size={200}>
                Class Candidates
              </Text>
              <Badge appearance="outline" size="small">
                {allClasses.length}
              </Badge>
            </div>

            {allClasses.map((c, idx) => {
              const pct = Math.round(c.confidence * 100);
              return (
                <div
                  key={`${c.type}-${idx}`}
                  style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>{c.type}</span>
                    <span className={styles.mono}>{pct}%</span>
                  </div>
                  <div className={styles.probBarBg}>
                    <div
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        height: '100%',
                        backgroundColor: getClassStrokeColor(c.type),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Candidates */}
          <div className={styles.subPanel}>
            <div className={styles.subHeader}>
              <Text weight="semibold" size={200}>
                Color Candidates
              </Text>
              <Badge appearance="outline" size="small">
                {colorEntries.length > 0 ? `${colorEntries.length} detected` : 'None'}
              </Badge>
            </div>

            {colorEntries.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                {colorEntries.map((col, i) => (
                  <span
                    key={`${col.scope}-${col.name}-${i}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      backgroundColor: tokens.colorNeutralBackground3,
                      border: `1px solid ${tokens.colorNeutralStroke2}`,
                      fontSize: '11px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: col.hex,
                        border: '1px solid rgba(148,163,184,0.5)',
                      }}
                    />
                    {col.scope !== 'object' ? `${col.scope}:` : ''}
                    {col.name} {Math.round(col.score * 100)}%
                  </span>
                ))}
              </div>
            ) : (
              <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                No color attributes reported in this track payload.
              </Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
