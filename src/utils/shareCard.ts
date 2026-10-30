import { DailyWorkout, UserProfile } from '../types/workout.ts';

interface ShareCardData {
  userName: string;
  dateStr: string;
  split: string;
  durationText: string;
  volumeKg: number;
  totalSets: number;
  caloriesBurned: number;
  exercises: Array<{ name: string; setsText: string; volumeText?: string }>;
  prsAchieved?: string[];
}

/**
 * Renders an aesthetic high-contrast dark card on an HTML5 canvas
 * and triggers an automatic PNG download for social sharing.
 */
export function exportWorkoutShareCard(data: ShareCardData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1080;
      const height = 1350; // 4:5 Instagram / social portrait ratio
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 1. Background: Deep charcoal / near black gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#101014');
      bgGrad.addColorStop(0.5, '#16161b');
      bgGrad.addColorStop(1, '#0e0e12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle metallic mesh / grid glow
      const glowGrad = ctx.createRadialGradient(width / 2, 240, 10, width / 2, 240, 500);
      glowGrad.addColorStop(0, 'rgba(187, 134, 252, 0.18)');
      glowGrad.addColorStop(0.6, 'rgba(3, 218, 198, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, 600);

      // Outer metallic border
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, width - 64, height - 64);

      // Inner card panel
      const panelX = 56;
      const panelY = 56;
      const panelW = width - 112;
      const panelH = height - 112;

      ctx.fillStyle = '#18181b';
      roundRect(ctx, panelX, panelY, panelW, panelH, 28);
      ctx.fill();

      ctx.strokeStyle = 'rgba(187, 134, 252, 0.35)';
      ctx.lineWidth = 2;
      roundRect(ctx, panelX, panelY, panelW, panelH, 28);
      ctx.stroke();

      // Top branding: VULCAN
      ctx.textAlign = 'center';

      // Flame/Logo accent circle
      ctx.fillStyle = '#bb86fc';
      ctx.beginPath();
      ctx.arc(width / 2, 135, 28, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame icon dot
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(width / 2, 135, 12, 0, Math.PI * 2);
      ctx.fill();

      // Vulcan Title
      ctx.font = '900 44px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('VULCAN', width / 2, 210);

      // Subtitle
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText('FORGING PEAK STRENGTH & PROGRESSIVE OVERLOAD', width / 2, 242);

      // Date & Split Badge
      const splitBadgeText = `${data.split.toUpperCase()} SESSION  •  ${data.dateStr.toUpperCase()}`;
      ctx.font = '700 16px "JetBrains Mono", monospace';
      const badgeMetrics = ctx.measureText(splitBadgeText);
      const badgeW = badgeMetrics.width + 40;
      const badgeH = 36;
      const badgeX = (width - badgeW) / 2;
      const badgeY = 270;

      ctx.fillStyle = 'rgba(187, 134, 252, 0.15)';
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 18);
      ctx.fill();
      ctx.strokeStyle = '#bb86fc';
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 18);
      ctx.stroke();

      ctx.fillStyle = '#bb86fc';
      ctx.fillText(splitBadgeText, width / 2, badgeY + 24);

      // 4 Highlight Metric Cards
      const metricsY = 340;
      const cardW = 215;
      const cardH = 120;
      const cardGap = 16;
      const totalMetricsW = 4 * cardW + 3 * cardGap;
      const startX = (width - totalMetricsW) / 2;

      const metricCards = [
        { label: 'DURATION', val: data.durationText, unit: 'time', color: '#03dac6' },
        { label: 'VOLUME', val: data.volumeKg.toLocaleString(), unit: 'kg lifted', color: '#bb86fc' },
        { label: 'SETS', val: String(data.totalSets), unit: 'completed', color: '#ffffff' },
        { label: 'ENERGY', val: String(Math.round(data.caloriesBurned)), unit: 'kcal burned', color: '#03dac6' },
      ];

      metricCards.forEach((mc, i) => {
        const mx = startX + i * (cardW + cardGap);
        ctx.fillStyle = '#101014';
        roundRect(ctx, mx, metricsY, cardW, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1.5;
        roundRect(ctx, mx, metricsY, cardW, cardH, 16);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#71717a';
        ctx.fillText(mc.label, mx + cardW / 2, metricsY + 30);

        ctx.font = '900 28px "JetBrains Mono", monospace';
        ctx.fillStyle = mc.color;
        ctx.fillText(mc.val, mx + cardW / 2, metricsY + 68);

        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(mc.unit, mx + cardW / 2, metricsY + 94);
      });

      // PRs Highlight Section (If Any)
      let currentSectionY = 495;
      if (data.prsAchieved && data.prsAchieved.length > 0) {
        const prBoxW = width - 180;
        const prBoxH = 110;
        const prBoxX = 90;

        ctx.fillStyle = 'rgba(187, 134, 252, 0.12)';
        roundRect(ctx, prBoxX, currentSectionY, prBoxW, prBoxH, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(187, 134, 252, 0.6)';
        ctx.lineWidth = 2;
        roundRect(ctx, prBoxX, currentSectionY, prBoxW, prBoxH, 16);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '900 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#bb86fc';
        ctx.fillText('🏆 NEW PERSONAL RECORDS UNLOCKED', prBoxX + 24, currentSectionY + 34);

        ctx.font = '600 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        data.prsAchieved.slice(0, 2).forEach((pr, idx) => {
          ctx.fillText(`• ${pr}`, prBoxX + 24, currentSectionY + 65 + idx * 24);
        });

        currentSectionY += 135;
      }

      // Exercise Performance Breakdown Box
      const exBoxX = 90;
      const exBoxW = width - 180;
      const exBoxH = height - currentSectionY - 180;

      ctx.fillStyle = '#121216';
      roundRect(ctx, exBoxX, currentSectionY, exBoxW, exBoxH, 20);
      ctx.fill();
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1.5;
      roundRect(ctx, exBoxX, currentSectionY, exBoxW, exBoxH, 20);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText('EXERCISE BREAKDOWN', exBoxX + 28, currentSectionY + 36);

      let rowY = currentSectionY + 70;
      const maxRows = 5;
      const displayExercises = data.exercises.slice(0, maxRows);

      displayExercises.forEach((ex) => {
        ctx.textAlign = 'left';
        ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ex.name, exBoxX + 28, rowY);

        ctx.font = '500 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(ex.setsText, exBoxX + 28, rowY + 22);

        if (ex.volumeText) {
          ctx.textAlign = 'right';
          ctx.font = '700 16px "JetBrains Mono", monospace';
          ctx.fillStyle = '#bb86fc';
          ctx.fillText(ex.volumeText, exBoxX + exBoxW - 28, rowY + 12);
        }

        // Divider line
        ctx.strokeStyle = '#1e1e24';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(exBoxX + 28, rowY + 34);
        ctx.lineTo(exBoxX + exBoxW - 28, rowY + 34);
        ctx.stroke();

        rowY += 52;
      });

      if (data.exercises.length > maxRows) {
        ctx.textAlign = 'center';
        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#71717a';
        ctx.fillText(
          `+ ${data.exercises.length - maxRows} more exercises recorded in session`,
          width / 2,
          rowY + 10
        );
      }

      // Footer: Athlete Signature & Applet URL
      ctx.textAlign = 'center';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`ATHLETE: ${data.userName.toUpperCase()}`, width / 2, height - 90);

      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#71717a';
      ctx.fillText('TRACKED WITH VULCAN  •  MOBILE PROGRESSIVE OVERLOAD', width / 2, height - 68);

      // Convert to PNG data URL and trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `vulcan-workout-${data.dateStr}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
