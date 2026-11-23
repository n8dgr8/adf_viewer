import React from 'react';
import {
  makeStyles,
  tokens,
  mergeClasses,
  Title3,
  Body1,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    gap: tokens.spacingVerticalM,
    height: '100%',
    width: '100%',
    color: tokens.colorNeutralForeground3,
  },
  illustration: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorBrandForeground1,
  },
  title: {
    color: tokens.colorNeutralForeground1,
  },
  description: {
    maxWidth: '420px',
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
});

export interface EmptyViewProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  title,
  description,
  illustration,
  action,
  className,
  ...rest
}) => {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.root, className)} {...rest}>
      {illustration && <div className={styles.illustration}>{illustration}</div>}
      <Title3 className={styles.title}>{title}</Title3>
      {description && <Body1 className={styles.description}>{description}</Body1>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
};
