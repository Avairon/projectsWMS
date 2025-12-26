import { useProjects } from "@/hooks/use-projects";
import { useDirections, useUsers } from "@/hooks/use-resources";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { CalendarIcon, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, PROJECT_STATUS } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function ProjectsPage() {
  const { projects, createProject } = useProjects();
  const { directions } = useDirections();
  const { data: users } = useUsers();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertProjectSchema>>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      direction: "",
      expectedResult: "",
      startDate: format(new Date(), "dd.MM.yyyy"),
      status: PROJECT_STATUS.IN_PROGRESS,
      // We'll manage date objects separately for the Calendar component
    },
  });

  // Separate state for dates to handle Date object -> string conversion
  const [date, setDate] = useState<Date | undefined>(new Date());

  const managers = users?.filter(u => u.role === 'manager' || u.role === 'admin') || [];
  const supervisors = users?.filter(u => u.role === 'supervisor' || u.role === 'admin') || [];

  const onSubmit = (data: z.infer<typeof insertProjectSchema>) => {
    createProject.mutate({
      ...data,
      startDate: date ? format(date, "dd.MM.yyyy") : format(new Date(), "dd.MM.yyyy"),
      managerId: data.managerId || user!.id, // Default to current user if manager create
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  const canCreate = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Проекты</h1>
          <p className="text-slate-500">Список всех текущих проектов</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Новый проект
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создание нового проекта</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название проекта</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите название" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="direction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Направление</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите направление" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {directions?.map(d => (
                                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Краткое описание целей и задач" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormItem className="flex flex-col">
                      <FormLabel>Дата начала</FormLabel>
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
                            defaultMonth={new Date(2025, 0)} // Default to 2025 as requested
                            locale={ru}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="expectedResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ожидаемый результат</FormLabel>
                          <FormControl>
                            <Input placeholder="KPI, продукт..." {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="managerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Руководитель проекта</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите руководителя" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {managers.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supervisorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Куратор направления</FormLabel>
                          <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите куратора" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supervisors.map(u => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createProject.isPending}>
                    Создать проект
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-t-4"
              style={{
                borderTopColor: project.status === PROJECT_STATUS.COMPLETED ? '#27ae60' :
                              project.status === PROJECT_STATUS.PAUSED ? '#e74c3c' : '#3498db'
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                    {project.direction}
                  </Badge>
                  <Badge variant="outline" className={
                    project.status === PROJECT_STATUS.COMPLETED ? "bg-green-50 text-green-700 border-green-200" :
                    project.status === PROJECT_STATUS.PAUSED ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }>
                    {project.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl line-clamp-2">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Руководитель:</span>
                    <span className="font-medium text-slate-900 truncate max-w-[150px]">{project.manager.name}</span>
                  </div>
                  {project.supervisor && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Куратор:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[150px]">{project.supervisor.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Начало:</span>
                    <span className="font-mono text-slate-700">{project.startDate}</span>
                  </div>
                  {project.endDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Дедлайн:</span>
                      <span className="font-mono text-slate-700">{project.endDate}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects?.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
            Нет активных проектов. Создайте первый проект!
          </div>
        )}
      </div>
    </div>
  );
}
