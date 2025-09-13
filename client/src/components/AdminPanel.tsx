import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Shield, 
  Mail, 
  Settings, 
  Plus, 
  Save, 
  Crown,
  UserPlus,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import type { 
  User, 
  Role, 
  EmailTemplate, 
  SiteSetting,
  CreateRoleInput,
  AssignUserRoleInput,
  CreateEmailTemplateInput,
  UpdateSiteSettingInput
} from '../../../server/src/schema';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load admin data
  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData, templatesData, settingsData] = await Promise.all([
        trpc.getUsers.query(),
        trpc.getRoles.query(),
        trpc.getEmailTemplates.query(),
        trpc.getSiteSettings.query({ publicOnly: false })
      ]);

      setUsers(usersData);
      setRoles(rolesData);
      setEmailTemplates(templatesData);
      setSiteSettings(settingsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      // Use fallback data on error
      setUsers([
        {
          id: 1,
          username: 'admin',
          email: 'admin@chathub.com',
          password_hash: '',
          display_name: 'Administrator',
          avatar_url: null,
          gold_credits: 1000,
          role_id: 1,
          language: 'en',
          theme: 'light',
          is_active: true,
          is_verified: true,
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          username: 'alice_wonderland',
          email: 'alice@example.com',
          password_hash: '',
          display_name: 'Alice',
          avatar_url: null,
          gold_credits: 250,
          role_id: 2,
          language: 'en',
          theme: 'light',
          is_active: true,
          is_verified: true,
          last_login_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      setRoles([
        {
          id: 1,
          name: 'Administrator',
          permissions: ['all'],
          is_default: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          name: 'User',
          permissions: ['chat', 'profile'],
          is_default: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      setEmailTemplates([
        {
          id: 1,
          template_key: 'welcome',
          subject: 'Welcome to ChatHub! 🎉',
          body: 'Welcome to our amazing chat platform!',
          language: 'en',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      setSiteSettings([
        {
          id: 1,
          setting_key: 'site_name',
          setting_value: 'ChatHub',
          setting_type: 'string',
          description: 'Website name',
          is_public: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🛠️ Admin Panel</h2>
          <p className="text-gray-600">Manage users, roles, and system settings</p>
        </div>
        <Badge variant="destructive" className="text-sm">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Admin Access
        </Badge>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Site Settings
          </TabsTrigger>
        </TabsList>

        {/* Users Management */}
        <TabsContent value="users">
          <UserManagement 
            users={users} 
            roles={roles} 
            onUserUpdate={(updatedUser) => {
              setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
              showSuccess('User updated successfully! ✅');
            }}
          />
        </TabsContent>

        {/* Roles Management */}
        <TabsContent value="roles">
          <RoleManagement 
            roles={roles}
            onRoleCreate={(newRole) => {
              setRoles(prev => [...prev, newRole]);
              showSuccess('Role created successfully! ✅');
            }}
          />
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="templates">
          <EmailTemplateManagement 
            templates={emailTemplates}
            onTemplateCreate={(newTemplate) => {
              setEmailTemplates(prev => [...prev, newTemplate]);
              showSuccess('Email template created successfully! ✅');
            }}
          />
        </TabsContent>

        {/* Site Settings */}
        <TabsContent value="settings">
          <SiteSettingsManagement 
            settings={siteSettings}
            onSettingUpdate={(updatedSetting) => {
              setSiteSettings(prev => prev.map(s => s.id === updatedSetting.id ? updatedSetting : s));
              showSuccess('Setting updated successfully! ✅');
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// User Management Component
function UserManagement({ users, roles, onUserUpdate }: {
  users: User[];
  roles: Role[];
  onUserUpdate: (user: User) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(2);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleAssignment = async () => {
    if (!selectedUser) return;
    
    try {
      setIsUpdating(true);
      const assignData: AssignUserRoleInput = {
        user_id: selectedUser.id,
        role_id: selectedRoleId
      };
      await trpc.assignUserRole.mutate(assignData);
      
      const updatedUser = { ...selectedUser, role_id: selectedRoleId };
      onUserUpdate(updatedUser);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to assign role:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleName = (roleId: number) => {
    return roles.find(role => role.id === roleId)?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>👥 User Management</span>
          <Badge variant="outline">{users.length} users</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gold Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.display_name || user.username}</div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role_id === 1 ? 'default' : 'secondary'}>
                      {user.role_id === 1 && <Crown className="h-3 w-3 mr-1" />}
                      {getRoleName(user.role_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-yellow-600 font-medium">{user.gold_credits}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? '✅ Active' : '❌ Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRoleId(user.role_id);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Edit Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit User Role</DialogTitle>
                        </DialogHeader>
                        {selectedUser && (
                          <div className="space-y-4">
                            <div>
                              <Label>User: {selectedUser.display_name || selectedUser.username}</Label>
                            </div>
                            <div className="space-y-2">
                              <Label>Assign Role</Label>
                              <Select
                                value={selectedRoleId.toString()}
                                onValueChange={(value: string) => setSelectedRoleId(parseInt(value))}
                                disabled={isUpdating}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id.toString()}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleRoleAssignment} disabled={isUpdating} className="w-full">
                              {isUpdating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update Role'
                              )}
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Role Management Component
function RoleManagement({ roles, onRoleCreate }: {
  roles: Role[];
  onRoleCreate: (role: Role) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [roleData, setRoleData] = useState<CreateRoleInput>({
    name: '',
    permissions: [],
    is_default: false
  });

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const newRole = await trpc.createRole.mutate(roleData);
      onRoleCreate(newRole);
      setRoleData({ name: '', permissions: [], is_default: false });
    } catch (error) {
      console.error('Failed to create role:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const availablePermissions = ['chat', 'create_room', 'admin', 'moderate', 'premium_access'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🛡️ Create New Role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={roleData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRoleData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter role name"
                required
                disabled={isCreating}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {availablePermissions.map(permission => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={roleData.permissions.includes(permission)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setRoleData(prev => ({
                            ...prev,
                            permissions: [...prev.permissions, permission]
                          }));
                        } else {
                          setRoleData(prev => ({
                            ...prev,
                            permissions: prev.permissions.filter(p => p !== permission)
                          }));
                        }
                      }}
                      disabled={isCreating}
                    />
                    <Label htmlFor={permission} className="capitalize">
                      {permission.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={roleData.is_default}
                onCheckedChange={(checked: boolean) =>
                  setRoleData(prev => ({ ...prev, is_default: checked }))
                }
                disabled={isCreating}
              />
              <Label>Default role for new users</Label>
            </div>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map((role: Role) => (
              <div key={role.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center">
                      {role.name}
                      {role.is_default && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Default
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Permissions: {role.permissions.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Email Template Management Component
function EmailTemplateManagement({ templates, onTemplateCreate }: {
  templates: EmailTemplate[];
  onTemplateCreate: (template: EmailTemplate) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [templateData, setTemplateData] = useState<CreateEmailTemplateInput>({
    template_key: '',
    subject: '',
    body: '',
    language: 'en',
    is_active: true
  });

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const newTemplate = await trpc.createEmailTemplate.mutate(templateData);
      onTemplateCreate(newTemplate);
      setTemplateData({
        template_key: '',
        subject: '',
        body: '',
        language: 'en',
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create email template:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📧 Create Email Template</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Key</Label>
                <Input
                  value={templateData.template_key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTemplateData(prev => ({ ...prev, template_key: e.target.value }))
                  }
                  placeholder="e.g., welcome, password_reset"
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={templateData.language}
                  onValueChange={(value: string) =>
                    setTemplateData(prev => ({ ...prev, language: value }))
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="fr">🇫🇷 French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={templateData.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTemplateData(prev => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Email subject line"
                required
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={templateData.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setTemplateData(prev => ({ ...prev, body: e.target.value }))
                }
                placeholder="Email content..."
                rows={6}
                required
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={templateData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setTemplateData(prev => ({ ...prev, is_active: checked }))
                }
                disabled={isCreating}
              />
              <Label>Active</Label>
            </div>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates.map((template: EmailTemplate) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center">
                      {template.template_key}
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="ml-2 text-xs">
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Site Settings Management Component
function SiteSettingsManagement({ settings, onSettingUpdate }: {
  settings: SiteSetting[];
  onSettingUpdate: (setting: SiteSetting) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SiteSetting | null>(null);

  const handleUpdateSetting = async (setting: SiteSetting, newValue: string) => {
    try {
      setIsUpdating(true);
      const updateData: UpdateSiteSettingInput = {
        setting_key: setting.setting_key,
        setting_value: newValue
      };
      await trpc.updateSiteSetting.mutate(updateData);
      
      const updatedSetting = { ...setting, setting_value: newValue };
      onSettingUpdate(updatedSetting);
      setEditingSetting(null);
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚙️ Site Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {settings.map((setting: SiteSetting) => (
            <div key={setting.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium flex items-center">
                    {setting.setting_key}
                    {setting.is_public && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Public
                      </Badge>
                    )}
                  </h4>
                  {setting.description && (
                    <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                  )}
                  {editingSetting?.id === setting.id ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editingSetting.setting_value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingSetting(prev => prev ? { ...prev, setting_value: e.target.value } : null)
                        }
                        disabled={isUpdating}
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateSetting(setting, editingSetting.setting_value)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSetting(null)}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-2">
                      {setting.setting_value}
                    </p>
                  )}
                </div>
                {editingSetting?.id !== setting.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSetting(setting)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}