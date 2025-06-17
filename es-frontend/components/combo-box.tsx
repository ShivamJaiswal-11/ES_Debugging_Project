"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface optionList {
  value: string
  label: string
}
type ComboboxProps = {
  options:optionList[]
  val: string
  setVal: React.Dispatch<React.SetStateAction<string>>
  innerText:string
  width?: string
}

export function ComboBox({options, val, setVal ,innerText,width="200px"}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`justify-between dark:text-gray-300 text-zinc-800 hover:cursor-pointer w-[${width}] `}
        >
          <div className="flex flex-row justify-between w-full">
          <div className="overflow-hidden">{val
            ? options.find((x) => x.value === val)?.label
            : `Select ${innerText} `}
          </div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50 pt-1" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`w-[${width}] p-0`}>
        <Command>
          <CommandInput placeholder={`Search ${innerText}...`} />
          <CommandList>
            <CommandEmpty>Empty.</CommandEmpty>
            <CommandGroup>
              {options.map((source) => (
                <CommandItem
                  key={source.value}
                  value={source.value}
                  onSelect={(currentValue) => {
                    setVal(currentValue === val ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      val === source.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {source.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
