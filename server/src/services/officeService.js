import { Office } from '../models/Office.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function officeForUser(user) {
  const office = user.assignedOfficeId
    ? await Office.findById(user.assignedOfficeId)
    : await Office.findOne({ active: true }).sort({ createdAt: 1 });
  if (!office) throw new HttpError(409, 'No office has been set up yet.');
  return office;
}
