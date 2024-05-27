# Effect-Ts Assignment 

## Architecture 


1. I have used two services in this application
   - TaskRepository Service 
     - > class TaskRepository extends Context.Tag("TaskRepository")<
  TaskRepository,
  Effect.Effect.Success<typeof makeTaskRepository>
>() {
  static readonly Live = Layer.effect(TaskRepository, makeTaskRepository);
}

   - Express Service   
     - >class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {
  static readonly Live = Layer.sync(Express, () => {
    const app = express();
    app.use(bodyParser.json());
    return app;
  });
}



This application uses `Effect's Runtime` to laye