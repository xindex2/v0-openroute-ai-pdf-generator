"use client"

import { Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PricingPlans() {
  return (
    <div className="grid gap-4">
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Pro Plan</CardTitle>
          <CardDescription>For professionals and small businesses</CardDescription>
          <div className="mt-1 text-3xl font-bold">
            $12<span className="text-sm font-normal text-muted-foreground">/month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Unlimited document generation</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Advanced editing features</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Custom branding</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Document history & storage</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Priority support</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Upgrade Now</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
          <CardDescription>For larger organizations with advanced needs</CardDescription>
          <div className="mt-1 text-3xl font-bold">
            $49<span className="text-sm font-normal text-muted-foreground">/month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Everything in Pro</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Team collaboration</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Advanced analytics</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>API access</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Dedicated account manager</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Contact Sales
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
