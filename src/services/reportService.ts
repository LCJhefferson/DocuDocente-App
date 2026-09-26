import { desc, eq } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { activities, evidences, reports, unitResults } from '../database/schema';
import { CreateReportInput, UnitResultInput } from '../models/Report';

export class ReportService {
  /**
   * Crea un informe en estado borrador con sus métricas estadísticas
   */
  static async createReport(input: CreateReportInput, units: UnitResultInput[]) {
    const reportId = uuidv4();
    const now = new Date().toISOString();

    // 1. Insertar Cabecera del Reporte
    await db.insert(reports).values({
      id: reportId,
      templateId: input.templateId,
      reportNumber: input.reportNumber,
      toName: input.toName,
      toRole: input.toRole,
      fromName: input.fromName,
      subject: input.subject,
      dateStr: input.dateStr,
      courseName: input.courseName,
      cycle: input.cycle,
      semester: input.semester,
      totalStudents: input.totalStudents,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Insertar Unidades (Calcular porcentajes de Aprobados/Desaprobados)
    for (const u of units) {
      const total = u.approvedCount + u.disapprovedCount;
      const approvedPercentage = total > 0 ? (u.approvedCount / total) * 100 : 0;
      const disapprovedPercentage = total > 0 ? (u.disapprovedCount / total) * 100 : 0;

      await db.insert(unitResults).values({
        id: uuidv4(),
        reportId: reportId,
        unitName: u.unitName,
        approvedCount: u.approvedCount,
        disapprovedCount: u.disapprovedCount,
        approvedPercentage: parseFloat(approvedPercentage.toFixed(2)),
        disapprovedPercentage: parseFloat(disapprovedPercentage.toFixed(2)),
        interpretationText: u.interpretationText || '',
      });
    }

    return reportId;
  }

  /**
   * Obtiene todos los informes ordenados por fecha de creación
   */
  static async getAllReports() {
    return await db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  /**
   * Obtiene un informe consolidado con sus unidades, actividades y evidencias
   */
  static async getReportFullDetails(reportId: string) {
    const reportData = await db.select().from(reports).where(eq(reports.id, reportId));
    if (reportData.length === 0) return null;

    const units = await db.select().from(unitResults).where(eq(unitResults.reportId, reportId));
    const reportActivities = await db.select().from(activities).where(eq(activities.reportId, reportId));

    const activitiesWithEvidences = await Promise.all(
      reportActivities.map(async (act) => {
        const evs = await db.select().from(evidences).where(eq(evidences.activityId, act.id));
        return { ...act, evidences: evs };
      })
    );

    return {
      report: reportData[0],
      units,
      activities: activitiesWithEvidences,
    };
  }

  /**
   * Elimina un informe y todas sus dependencias (efecto CASCADE automático)
   */
  static async deleteReport(reportId: string) {
    await db.delete(reports).where(eq(reports.id, reportId));
  }
}