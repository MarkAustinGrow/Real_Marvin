'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Toaster } from '../components/ui/toaster'
import { useToast } from '../components/ui/use-toast'

export default function Home() {
  const { toast } = useToast()
  const [status, setStatus] = useState({
    status: 'loading',
    nextScheduledTweet: '',
    timeUntilNextTweet: 0
  })
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [tweetPreview, setTweetPreview] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    // Fetch status
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setStatus({
          status: data.status,
          nextScheduledTweet: new Date(data.nextScheduledTweet).toLocaleString(),
          timeUntilNextTweet: data.timeUntilNextTweet
        })
      })
      .catch(err => {
        console.error('Error fetching status:', err)
        toast({
          title: 'Error',
          description: 'Failed to fetch status. Please refresh the page.',
          variant: 'destructive'
        })
      })

    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories)
      })
      .catch(err => {
        console.error('Error fetching categories:', err)
        toast({
          title: 'Error',
          description: 'Failed to fetch categories. Please refresh the page.',
          variant: 'destructive'
        })
      })
  }, [toast])

  const handlePreviewTweet = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Error',
        description: 'Please select a category',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/test-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: selectedCategory,
          previewOnly: true
        })
      })
      const data = await res.json()
      if (data.success) {
        setTweetPreview(data.content.text)
        toast({
          title: 'Success',
          description: 'Tweet preview generated successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to generate tweet preview',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('Error generating tweet preview:', err)
      toast({
        title: 'Error',
        description: 'Failed to generate tweet preview',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePostTweet = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Error',
        description: 'Please select a category',
        variant: 'destructive'
      })
      return
    }

    if (!confirm('Are you sure you want to post this test tweet?')) {
      return
    }

    setIsPosting(true)
    try {
      const res = await fetch('/api/test-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: selectedCategory,
          previewOnly: false
        })
      })
      const data = await res.json()
      if (data.success) {
        setTweetPreview(data.content.text)
        toast({
          title: 'Success',
          description: 'Tweet posted successfully!',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to post tweet',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('Error posting tweet:', err)
      toast({
        title: 'Error',
        description: 'Failed to post tweet',
        variant: 'destructive'
      })
    } finally {
      setIsPosting(false)
    }
  }

  // Calculate hours and minutes until next tweet
  const hoursUntil = Math.floor(status.timeUntilNextTweet / (1000 * 60 * 60))
  const minutesUntil = Math.floor((status.timeUntilNextTweet % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="py-8">
      <header className="py-8">
        <h1 className="text-4xl font-bold text-primary">Marvin AI Agent - Admin</h1>
        <p className="mt-2 text-muted-foreground">Manage and test your AI agent's content generation</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Status:</span> {status.status}
              </div>
              <div>
                <span className="font-semibold">Next scheduled tweet:</span>
                <div>{status.nextScheduledTweet}</div>
              </div>
              <div>
                <span className="font-semibold">Time until next tweet:</span>
                <div>{hoursUntil}h {minutesUntil}m</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-2">
          <Tabs defaultValue="tweet">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tweet">Tweet Generation</TabsTrigger>
              <TabsTrigger value="blog">Blog Post</TabsTrigger>
              <TabsTrigger value="engagement">Engagement Rules</TabsTrigger>
            </TabsList>
            
            {/* Tweet Generation Tab */}
            <TabsContent value="tweet">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Test Tweet</CardTitle>
                  <CardDescription>Create and preview tweets before posting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {tweetPreview && (
                    <div className="p-4 border rounded-md bg-card">
                      <h3 className="font-semibold mb-2">Tweet Preview</h3>
                      <p>{tweetPreview}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={handlePreviewTweet}
                    disabled={isGenerating || !selectedCategory}
                  >
                    {isGenerating ? 'Generating...' : 'Preview Tweet'}
                  </Button>
                  <Button 
                    onClick={handlePostTweet}
                    disabled={isPosting || !selectedCategory}
                  >
                    {isPosting ? 'Posting...' : 'Post Tweet'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Blog Post Tab */}
            <TabsContent value="blog">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Blog Post</CardTitle>
                  <CardDescription>Create and manage blog posts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Input id="theme" placeholder="e.g., technology, AI ethics, creativity" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" placeholder="e.g., AI, philosophy, art" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="use-memory" className="h-4 w-4" defaultChecked />
                    <Label htmlFor="use-memory">Use Memory (include relevant memories in generation)</Label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Generate Blog Post</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Engagement Rules Tab */}
            <TabsContent value="engagement">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Rules</CardTitle>
                  <CardDescription>Configure how Marvin responds to engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Engagement rules coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Toaster />
    </div>
  )
}
