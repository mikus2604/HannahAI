import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Plus, Edit, Trash2, Check, X, Loader2 } from "lucide-react";

interface SystemPrompt {
  id: string;
  title: string;
  prompt: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const SystemPromptManagement = () => {
  const { toast } = useToast();
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState({ title: "", prompt: "" });
  const [editPrompt, setEditPrompt] = useState({ title: "", prompt: "" });

  const fetchSystemPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSystemPrompts(data || []);
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load system prompts",
        variant: "destructive"
      });
    }
  };

  const createSystemPrompt = async () => {
    if (!newPrompt.title || !newPrompt.prompt) {
      toast({
        title: "Error",
        description: "Please fill in both title and prompt",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('system_prompts')
        .insert({
          title: newPrompt.title,
          prompt: newPrompt.prompt,
          user_id: userData.user.id,
          is_active: false
        });
      
      if (error) throw error;
      
      setNewPrompt({ title: "", prompt: "" });
      await fetchSystemPrompts();
      
      toast({
        title: "Success",
        description: "System prompt created successfully"
      });
    } catch (error) {
      console.error('Error creating system prompt:', error);
      toast({
        title: "Error",
        description: "Failed to create system prompt",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSystemPrompt = async (id: string) => {
    if (!editPrompt.title || !editPrompt.prompt) {
      toast({
        title: "Error",
        description: "Please fill in both title and prompt",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('system_prompts')
        .update({
          title: editPrompt.title,
          prompt: editPrompt.prompt
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setEditingPrompt(null);
      setEditPrompt({ title: "", prompt: "" });
      await fetchSystemPrompts();
      
      toast({
        title: "Success",
        description: "System prompt updated successfully"
      });
    } catch (error) {
      console.error('Error updating system prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update system prompt",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSystemPrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this system prompt?")) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchSystemPrompts();
      
      toast({
        title: "Success",
        description: "System prompt deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting system prompt:', error);
      toast({
        title: "Error",
        description: "Failed to delete system prompt",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePromptActive = async (id: string, currentStatus: boolean) => {
    try {
      // If activating, deactivate all others first
      if (!currentStatus) {
        await supabase
          .from('system_prompts')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchSystemPrompts();
      
      toast({
        title: "Success",
        description: `System prompt ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling system prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update system prompt",
        variant: "destructive"
      });
    }
  };

  const startEditing = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt.id);
    setEditPrompt({ title: prompt.title, prompt: prompt.prompt });
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setEditPrompt({ title: "", prompt: "" });
  };

  useEffect(() => {
    fetchSystemPrompts();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            System Prompt Management
          </CardTitle>
          <CardDescription>
            Configure AI system prompts that control how your assistant responds to calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create New Prompt */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New System Prompt
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newTitle">Title</Label>
                <Input
                  id="newTitle"
                  placeholder="e.g., Default Receptionist Prompt"
                  value={newPrompt.title}
                  onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="newPrompt">System Prompt</Label>
                <Textarea
                  id="newPrompt"
                  placeholder="You are a professional AI receptionist for this business..."
                  className="min-h-[120px]"
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                />
              </div>
              <Button 
                onClick={createSystemPrompt}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create System Prompt
              </Button>
            </div>
          </div>

          {/* Existing Prompts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Existing System Prompts</h3>
            {systemPrompts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No system prompts created yet. Create one above to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {systemPrompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {editingPrompt === prompt.id ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`editTitle-${prompt.id}`}>Title</Label>
                          <Input
                            id={`editTitle-${prompt.id}`}
                            value={editPrompt.title}
                            onChange={(e) => setEditPrompt({ ...editPrompt, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`editPrompt-${prompt.id}`}>System Prompt</Label>
                          <Textarea
                            id={`editPrompt-${prompt.id}`}
                            className="min-h-[120px]"
                            value={editPrompt.prompt}
                            onChange={(e) => setEditPrompt({ ...editPrompt, prompt: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateSystemPrompt(prompt.id)}
                            disabled={isLoading}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{prompt.title}</h4>
                              <Badge 
                                variant={prompt.is_active ? "default" : "secondary"}
                              >
                                {prompt.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {prompt.prompt.length > 200 
                                ? `${prompt.prompt.substring(0, 200)}...` 
                                : prompt.prompt}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(prompt.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePromptActive(prompt.id, prompt.is_active)}
                          >
                            {prompt.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(prompt)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSystemPrompt(prompt.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
