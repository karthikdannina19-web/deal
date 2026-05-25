import { SupervisorController } from "@/modules/supervisor/supervisor.controller.js";

export async function POST(req) {
  return await SupervisorController.supervisorLogin(req);
}
