"use client"
import axios from "axios"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { Server, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Form,  FormControl,  FormField,  FormItem,  FormLabel,  FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComboBox } from "@/components/combo-box"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  url: z.string().min(1, {
    message: "Please enter the URL.",
  }),
  username: z.string().min(1, {
    message: "Please enter the Username.",
  }),
  password: z.string().min(1, {
    message: "Please enter the Password.",
  }),
})

const optionLists = [
  {
    value:"clusters_list",
    label:"Preloaded",
  },
  {
    value: "local",
    label: "Local Machine",
  },
  {
    value: "cloud",
    label: "Cloud Provider",
  },
]

interface cluster_info{
  id: string
  name: string
  url: string
}

export default function HomePage() {

  const [disableButton, setDisableButton] = useState(false)
  const [disableButton_1, setDisableButton_1] = useState(false)
  
  const router = useRouter()
  const [selectedCluster , setSelectedCluster]=useState<string>("")
  const [val, setVal] = useState("")
  const { theme, setTheme } = useTheme()
  const [clusterList, setClusterList]=useState<cluster_info[]>([{id:"c1",name:"Cluster_1",url:"http://localhost:9200/"},{id:"c2",name:"Cluster_2",url:"http://localhost:9201/"}])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password:"",
      url:""
    },
  })
 
  function onSubmit(values: z.infer<typeof formSchema>) {
    setDisableButton(true)
    const payload = {
    type: val,
    url: values.url,
    username: values.username,
    password: values.password,
    }
    console.log(payload);
    console.log("Payload for local cluster:", payload)
    axios.post("http://127.0.0.1:8000/init-client", payload)
      .then((response) => {
        console.log("Client initialized", response.data)
        localStorage.setItem("ClusterInit", "true");
        toast.success("Client initialized")
        setTimeout(() => {
          router.push("/dashboard/cluster")
        }, 400);
      })
      .catch((error) => {
        // console.error("Error initializing client:", error)
        alert("Please enter a valid details for the selected cluster.")
        setDisableButton(false)
      })
    console.log(values)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="hover:cursor-pointer bg-blue-200 hover:bg-blue-100 dark:bg-zinc-800 dark:hover:bg-zinc-900">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <Card className="w-full max-w-2xl min-h-96 align-middle content-center">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-4">
            <Server className="h-6 w-6" />
            Select Elasticsearch Cluster
          </CardTitle>
          <CardDescription>Choose the source of the cluster you want to monitor and diagnose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
          <div className="w-full flex items-center justify-center mb-4 flex-row">
            <ComboBox options={optionLists} val={val} setVal={setVal} innerText = "Source"/>
          </div>
          <div>
          {val=="local" ?
          <div className="text-center text-sm text-muted-foreground mb-4">
            <p>Please enter the URL where your local cluster is running along with your elastic Username and Password.</p>
            <div className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                   <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white ">URL</FormLabel>
                        <FormControl>
                          <Input placeholder="http://localhost:9200/" {...field} className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white">Username</FormLabel>
                        <FormControl>
                          <Input placeholder="elastic_user" {...field} className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white">Password</FormLabel>
                        <FormControl>
                          <Input placeholder="********" {...field} type="password" className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className={`w-3/4 h-12 hover:cursor-pointer`} disabled={disableButton}>Continue</Button>
                </form>
              </Form>
            </div>
          </div>
          :
          <div>{val=="cloud" ?
          <div className="text-center text-sm text-muted-foreground mb-4">
            <p>Please enter the API of your cluster along with Username and Password.</p>
            <div className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                   <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white">URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://bddfer.elastic-cloud.com:4" {...field} className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white">Username</FormLabel>
                        <FormControl>
                          <Input placeholder="elastic_user" {...field} className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black dark:text-white">Password</FormLabel>
                        <FormControl>
                          <Input placeholder="********" {...field} type="password" className="text-black dark:text-white"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className={`w-3/4 h-12 hover:cursor-pointer enabled:${disableButton}`} disabled={disableButton}>Continue</Button>
                </form>
              </Form>
            </div>
          </div>
          :
          <div>
            { val==="clusters_list" ? 
              <div>       
                <RadioGroup value={selectedCluster} onValueChange={setSelectedCluster}>
                  {clusterList.map((cluster) => (
                    <div key={cluster.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 bg-white dark:bg-black hover:dark:bg-muted/50">
                      <RadioGroupItem value={cluster.id} id={cluster.id} />
                      <Label htmlFor={cluster.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{cluster.name}</div>
                            <div className="text-sm text-muted-foreground">{cluster.url}</div>
                            {/* <div className="text-sm text-muted-foreground">{cluster.nodes} nodes</div> */}
                          </div>
                          {/* <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                            {cluster.status}
                          </span> */}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="pt-8 w-full flex justify-center pb-8">
                  <Button type="submit" className={`w-3/4 h-12 hover:cursor-pointer enabled:${disableButton_1}`} disabled={disableButton_1}>Continue</Button>
                </div>
              </div>
            :
              <div className="text-center text-sm text-muted-foreground mb-4">
              <p>Please select a source to continue.</p>
              </div>
            }
          </div>}
          </div>
        }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
