import { useTasks, useCreateTask } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useUsers } from "@/hooks/use-resources";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Plus, Filter, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, TASK_STATUS } from "@shared/schema";
import { z } from "zod";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function TasksPage() {
  const { data: tasks } = useTasks();
  const { projects } = useProjects();
  const { data: users } = useUsers();
  const { user } = useAuth();
  const createTask = useCreateTask();
  
  const [open, setOpen] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof insertTaskSchema>>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: format(new Date(), "dd.MM.yyyy"),
      status: TASK_STATUS.ACTIVE,
    },
  });

  const [date, setDate] = useState<Date | undefined>(new Date());

  const onSubmit = (data: z.infer<typeof insertTaskSchema>) => {
    createTask.mutate({
      ...data,
      deadline: date ? format(date, "dd.MM.yyyy") : format(new Date(), "dd.MM.yyyy"),
      startDate: format(new Date(), "dd.MM.yyyy"),
      createdBy: user!.id,
      createdAt: new Date().toISOString(),
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesProject = filterProject === "all" || t.projectId.toString() === filterProject;
      const matchesAssignee = filterAssignee === "all" || t.assigneeId?.toString() === filterAssignee;
      return matchesSearch && matchesProject && matchesAssignee;
    });
  }, [tasks, search, filterProject, filterAssignee]);

  const workers = users?.filter(u => u.role === 'worker' || u.role === 'manager') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Задачи</h1>
          <p className="text-slate-500">Управление задачами и отчетностью</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Новая задача
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Создание новой задачи</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Проект</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите проект" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название задачи</FormLabel>
                      <FormControl>
                        <Input placeholder="Сделать..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Подробности задачи..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Исполнитель</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Назначить сотрудника" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workers.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem className="flex flex-col">
                    <FormLabel>Дедлайн</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          defaultMonth={new Date(2025, 0)}
                          locale={ru}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createTask.isPending}>
                  Создать задачу
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Поиск задачи..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Проект" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все проекты</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Исполнитель" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все исполнители</SelectItem>
                {workers.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map(task => (
          <Link key={task.id} href={`/tasks/${task.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
              style={{
                borderLeftColor: task.status === TASK_STATUS.COMPLETED ? '#27ae60' : 
                               task.status === TASK_STATUS.DEFERRED ? '#e67e22' : '#3498db'
              }}
            >
              <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg text-slate-900">{task.title}</span>
                    <Badge variant="outline" className="text-xs">{task.project.name}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{task.deadline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{task.assignee?.name || 'Не назначен'}</span>
                  </div>
                  <Badge className={
                    task.status === TASK_STATUS.COMPLETED ? "bg-green-100 text-green-700 hover:bg-green-100" :
                    task.status === TASK_STATUS.DEFERRED ? "bg-orange-100 text-orange-700 hover:bg-orange-100" :
                    "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  }>
                    {task.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Задачи не найдены
          </div>
        )}
      </div>
    </div>
  );
}
