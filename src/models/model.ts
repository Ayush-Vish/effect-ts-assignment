import * as Schema from "@effect/schema/Schema";

export class TaskSchema extends Schema.Class<TaskSchema>("TaskSchema")({
  task_id: Schema.Number,
  name: Schema.String,
  status: Schema.String,
  description: Schema.String,
}) {}

export const CreateTaskParams = TaskSchema.pipe(Schema.omit("task_id"));
export type CreateTaskParams = Schema.Schema.Type<typeof CreateTaskParams>;

export const UpdateTaskParams = Schema.partial(
  TaskSchema.pipe(Schema.omit("task_id"))
);
export type UpdateTaskParams = Schema.Schema.Type<typeof UpdateTaskParams>;


export interface User {
  user_id: string;
  tasks: TaskSchema[];
}
