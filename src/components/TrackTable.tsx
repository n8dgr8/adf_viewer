import React from 'react';
import {
  Badge,
  Button,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CameraRegular,
  DismissRegular,
  FilterRegular,
  PersonRunningRegular,
  SearchRegular,
  VehicleCarProfileLtrRegular,
  VehicleTruckProfileRegular,
  VehicleBicycleRegular,
  BoxRegular,
} from '@fluentui/react-icons';
import { EmptyView } from '@axiscommunications/fluent-empty-view';
import { useCustomScrollbars } from '@axiscommunications/fluent-styles';
import { NormalizedTrackRecord } from '../types/adf';
import { formatBytes } from '../utils/adfParser';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  searchInput: {
    flex: 1,
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },
  chipsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
  },
  tableScrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  selectedRow: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    borderLeft: `3px solid #FFCC00`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  monoText: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: tokens.fontSizeBase200,
  },
  classCell: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
  },
  attrPill: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '1px 6px',
    borderRadius: tokens.borderRadiusSmall,
  },
  footerStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

export function getClassIcon(cls: string) {
  const c = cls.toLowerCase();
  if (c.includes('human') || c.includes('person') || c.includes('pedestrian')) {
    return <PersonRunningRegular />;
  }
  if (c.includes('truck') || c.includes('bus') || c.includes('van')) {
    return <VehicleTruckProfileRegular />;
  }
  if (c.includes('bike') || c.includes('bicycle') || c.includes('motorcycle')) {
    return <VehicleBicycleRegular />;
  }
  if (c.includes('vehicle') || c.includes('car') || c.includes('suv')) {
    return <VehicleCarProfileLtrRegular />;
  }
  return <BoxRegular />;
}

export function getClassBadgeColor(
  cls: string
): 'brand' | 'informative' | 'success' | 'warning' | 'important' | 'subtle' {
  const c = cls.toLowerCase();
  if (c.includes('human') || c.includes('person')) return 'informative';
  if (c.includes('vehicle') || c.includes('car') || c.includes('truck')) return 'warning';
  if (c.includes('bike') || c.includes('bicycle')) return 'success';
  return 'subtle';
}

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(11, 21); // HH:MM:SS.d
  } catch {
    return iso;
  }
}

export interface TrackTableProps {
  tracks: NormalizedTrackRecord[];
  totalCount: number;
  selectedUid: string | null;
  onSelectTrack: (uid: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  classFilter: string;
  onClassFilterChange: (cls: string) => void;
  onlyWithSnapshot: boolean;
  onOnlyWithSnapshotChange: (val: boolean) => void;
  onResetFilters: () => void;
}

const CLASS_FILTERS = ['all', 'human', 'vehicle', 'bike'];

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  totalCount,
  selectedUid,
  onSelectTrack,
  searchQuery,
  onSearchChange,
  classFilter,
  onClassFilterChange,
  onlyWithSnapshot,
  onOnlyWithSnapshotChange,
  onResetFilters,
}) => {
  const styles = useStyles();
  const scrollStyles = useCustomScrollbars();
  const totalAdfBytes = React.useMemo(
    () => tracks.reduce((sum, t) => sum + t.packetBytes, 0),
    [tracks]
  );

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <div className={styles.searchRow}>
          <Input
            className={styles.searchInput}
            size="small"
            contentBefore={<SearchRegular />}
            contentAfter={
              searchQuery ? (
                <Button
                  appearance="transparent"
                  size="small"
                  icon={<DismissRegular />}
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                />
              ) : undefined
            }
            placeholder="Filter by track ID, class, color, zone..."
            value={searchQuery}
            onChange={(_, data) => onSearchChange(data.value)}
          />
        </div>

        <div className={styles.chipRow}>
          <div className={styles.chipsLeft}>
            {CLASS_FILTERS.map((cls) => {
              const active = classFilter === cls;
              return (
                <Button
                  key={cls}
                  size="small"
                  appearance={active ? 'primary' : 'outline'}
                  onClick={() => onClassFilterChange(cls)}
                >
                  {cls === 'all' ? 'All Classes' : cls.charAt(0).toUpperCase() + cls.slice(1)}
                </Button>
              );
            })}
          </div>

          <Switch
            label="Has Snapshot"
            checked={onlyWithSnapshot}
            onChange={(_, d) => onOnlyWithSnapshotChange(d.checked)}
          />
        </div>
      </div>

      <div className={mergeClasses(styles.tableScrollArea, scrollStyles.scrollable)}>
        {tracks.length === 0 ? (
          totalCount === 0 ? (
            <EmptyView
              illustration={<BoxRegular fontSize={40} />}
              title="No Object Tracks Loaded"
              description="Drop a .json / .jsonl file anywhere, click Paste JSON, click Connect MQTT, or toggle Simulate Stream in the top bar."
            />
          ) : (
            <EmptyView
              illustration={<FilterRegular fontSize={40} />}
              title="No matching Object Track messages"
              description="Adjust your class or search filters to view loaded tracks."
              action={
                <Button appearance="secondary" size="small" onClick={onResetFilters}>
                  Reset Filters
                </Button>
              }
            />
          )
        ) : (
          <Table size="small" aria-label="ADF Object Track Messages">
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '84px' }}>End Time</TableHeaderCell>
                <TableHeaderCell style={{ width: '82px' }}>Track ID</TableHeaderCell>
                <TableHeaderCell style={{ width: '38px' }}>Ch</TableHeaderCell>
                <TableHeaderCell>Classification & Attributes</TableHeaderCell>
                <TableHeaderCell style={{ width: '60px' }}>Duration</TableHeaderCell>
                <TableHeaderCell style={{ width: '44px' }}>Pts</TableHeaderCell>
                <TableHeaderCell style={{ width: '68px' }}>Size</TableHeaderCell>
                <TableHeaderCell style={{ width: '44px', textAlign: 'center' }}>JPG</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((trk) => {
                const isSelected = trk.uid === selectedUid;
                const firstAttr = trk.attributesSummary[0];
                return (
                  <TableRow
                    key={trk.uid}
                    className={mergeClasses(styles.row, isSelected && styles.selectedRow)}
                    onClick={() => onSelectTrack(trk.uid)}
                    aria-selected={isSelected}
                  >
                    <TableCell>
                      <Tooltip content={`Start: ${trk.startTime}\nEnd: ${trk.endTime}`} relationship="description">
                        <Text className={styles.monoText}>{formatShortTime(trk.endTime)}</Text>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Tooltip content={trk.trackId} relationship="label">
                        <Text className={styles.monoText} weight="semibold">
                          {trk.trackId.slice(0, 8)}
                        </Text>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Badge appearance="outline" size="small">
                        {trk.channelId}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className={styles.classCell}>
                        <Badge
                          appearance="tint"
                          color={getClassBadgeColor(trk.primaryClass)}
                          icon={getClassIcon(trk.primaryClass)}
                        >
                          {trk.primaryClass}{' '}
                          {trk.primaryConfidence > 0
                            ? `${Math.round(trk.primaryConfidence * 100)}%`
                            : ''}
                        </Badge>
                        {firstAttr && (
                          <span className={styles.attrPill}>
                            {firstAttr.value}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Text className={styles.monoText}>{trk.durationSec.toFixed(1)}s</Text>
                    </TableCell>

                    <TableCell>
                      <Text className={styles.monoText}>{trk.observations.length}</Text>
                    </TableCell>

                    <TableCell>
                      <Tooltip
                        content={`Total Packet: ${formatBytes(trk.packetBytes)} (${trk.packetBytes.toLocaleString()} B)\nJSON Metadata: ${formatBytes(trk.metadataBytes)}\nSnapshot Base64: ${formatBytes(trk.snapshotBase64Bytes)}${trk.mqttTopic ? `\nMQTT Topic: ${trk.mqttTopic}` : ''}`}
                        relationship="description"
                      >
                        <Text className={styles.monoText}>{formatBytes(trk.packetBytes)}</Text>
                      </Tooltip>
                    </TableCell>

                    <TableCell style={{ textAlign: 'center' }}>
                      {trk.snapshot?.data ? (
                        <Tooltip content="Best Snapshot JPEG attached" relationship="label">
                          <Badge appearance="filled" color="brand" icon={<CameraRegular />} />
                        </Tooltip>
                      ) : trk.snapshot ? (
                        <Tooltip content="Snapshot metadata only (no inline base64)" relationship="label">
                          <Badge appearance="outline" color="informative" icon={<CameraRegular />} />
                        </Tooltip>
                      ) : (
                        <Text size={100} style={{ opacity: 0.35 }}>
                          —
                        </Text>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className={styles.footerStatus}>
        <span>
          Showing <strong>{tracks.length}</strong> of <strong>{totalCount}</strong> Object Tracks
          {tracks.length > 0 && (
            <>
              {' '}
              • Total ADF: <strong>{formatBytes(totalAdfBytes)}</strong>
            </>
          )}
        </span>
        <span>Use ↑ / ↓ arrows to step</span>
      </div>
    </div>
  );
};
