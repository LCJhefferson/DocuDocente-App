export interface CreateReportInput {
  templateId?: string;
  reportNumber: string;
  toName: string;
  toRole: string;
  fromName: string;
  subject: string;
  dateStr: string;
  courseName: string;
  cycle: string;
  semester: string;
  totalStudents: number;
}

export interface UnitResultInput {
  unitName: string;
  approvedCount: number;
  disapprovedCount: number;
  interpretationText?: string;
}