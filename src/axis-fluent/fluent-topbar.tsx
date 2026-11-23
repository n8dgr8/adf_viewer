import React from 'react';
import {
  makeStyles,
  tokens,
  mergeClasses,
  Text,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '48px',
    minHeight: '48px',
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalM,
    userSelect: 'none',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
  },
  brandBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  appTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
  },
  centerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flex: 1,
    justifyContent: 'center',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  appTitle?: string;
  subtitle?: React.ReactNode;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const AdfTrackIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="ADF Explorer"
  >
    <rect
      x="3"
      y="3"
      width="26"
      height="26"
      rx="5"
      stroke="#FFCC00"
      strokeWidth="2"
      fill="rgba(255, 204, 0, 0.08)"
    />
    <path
      d="M8 22C11 19 14 13 24 10"
      stroke="#FFCC00"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="22" r="3" fill="#22c55e" />
    <circle cx="15.5" cy="15" r="2.5" fill="#FFCC00" />
    <circle cx="24" cy="10" r="3" fill="#f97316" />
  </svg>
);

export const TopBar: React.FC<TopBarProps> = ({
  appTitle = 'ADF Explorer',
  subtitle,
  leftContent,
  centerContent,
  rightContent,
  className,
  children,
  ...rest
}) => {
  const styles = useStyles();

  return (
    <header className={mergeClasses(styles.root, className)} {...rest}>
      <div className={styles.leftSection}>
        <div className={styles.brandBadge}>
          <AdfTrackIcon size={24} />
          <Text className={styles.appTitle}>{appTitle}</Text>
        </div>
        {subtitle}
        {leftContent}
      </div>
      <div className={styles.centerSection}>{centerContent ?? children}</div>
      <div className={styles.rightSection}>{rightContent}</div>
    </header>
  );
};
