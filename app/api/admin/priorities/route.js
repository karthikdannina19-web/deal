import { PriorityController } from '@/modules/admin/priority.controller.js';

export async function GET(req) {
  return PriorityController.list(req);
}

export async function POST(req) {
  return PriorityController.save(req);
}
