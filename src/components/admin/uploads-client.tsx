"use client";

import { useEffect, useState, useCallback } from "react";
import { DOMAIN_CONFIGS } from "@/lib/domain-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  Pencil,
  Search,
  FolderOpen,
  Image as ImageIcon,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

interface UploadedImage {
  id: string;
  fileName: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function UploadsClient() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pathFilter, setPathFilter] = useState("");

  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Multi-upload state:
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [multiUploadFiles, setMultiUploadFiles] = useState<File[]>([]);
  const [multiUploadPath, setMultiUploadPath] = useState("");
  const [multiUploadProgress, setMultiUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  // Edit dialog state
  const [editImage, setEditImage] = useState<UploadedImage | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [deleteImage, setDeleteImage] = useState<UploadedImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview dialog state
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);

  const fetchImages = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "24");
        if (searchQuery) params.set("search", searchQuery);
        if (pathFilter) params.set("path", pathFilter);

        const res = await fetch(`/api/admin/uploads?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch uploads");
        const data = await res.json();
        setImages(data.images);
        setPagination(data.pagination);
      } catch (error) {
        toast.error("Failed to load images");
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, pathFilter],
  );

  useEffect(() => {
    fetchImages(1);
  }, [fetchImages]);

  // Handle file selection for preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
      if (!uploadFileName) {
        setUploadFileName(file.name.replace(/\.[^.]+$/, ""));
      }
    } else {
      setUploadPreview(null);
    }
  };

  // Обробка вибору кількох файлів
  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Перетворюємо FileList у масив
      setMultiUploadFiles(Array.from(e.target.files));
    }
  };

  // Логіка послідовного завантаження
  const handleMultiUpload = async () => {
    if (!multiUploadFiles.length) return;
    setIsUploading(true);
    setMultiUploadProgress({ current: 0, total: multiUploadFiles.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < multiUploadFiles.length; i++) {
      const file = multiUploadFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", multiUploadPath);
      // Зверни увагу: ми не передаємо кастомний fileName,
      // тому бекенд використає оригінальне ім'я файлу

      try {
        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          console.error(`Помилка завантаження файлу ${file.name}`);
          failCount++;
        }
      } catch (error) {
        console.error(`Мережева помилка для ${file.name}`, error);
        failCount++;
      }

      // Оновлюємо прогрес
      setMultiUploadProgress((prev) => ({ ...prev, current: i + 1 }));
    }

    // Показуємо результат
    if (failCount === 0) {
      toast.success(`Успішно завантажено всі ${successCount} файлів!`);
    } else {
      toast.warning(`Завантажено: ${successCount}. Помилок: ${failCount}`);
    }

    // Очищаємо стан
    setIsMultiUploadOpen(false);
    setMultiUploadFiles([]);
    setMultiUploadPath("");
    setIsUploading(false);
    fetchImages(pagination.page);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("path", uploadPath);
      if (uploadFileName) formData.append("fileName", uploadFileName);

      console.log("[upload] sending POST /api/admin/uploads", {
        fileName: uploadFile.name,
        size: uploadFile.size,
        type: uploadFile.type,
        path: uploadPath,
      });

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      console.log("[upload] response status:", res.status, res.statusText);

      if (!res.ok) {
        const text = await res.text();
        console.error("[upload] error response body:", text);
        let msg = `Upload failed (HTTP ${res.status})`;
        try {
          msg = JSON.parse(text).error || msg;
        } catch {}
        throw new Error(msg);
      }

      const uploaded = await res.json();
      console.log("[upload] success:", uploaded);

      toast.success("Image uploaded successfully");
      setIsUploadOpen(false);
      resetUploadForm();
      fetchImages(pagination.page);
    } catch (error: any) {
      console.error("[upload] caught error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPath("");
    setUploadFileName("");
    setUploadPreview(null);
  };

  const handleEdit = async () => {
    if (!editImage) return;
    setIsEditing(true);
    try {
      const res = await fetch(`/api/admin/uploads/${editImage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: editFileName, path: editPath }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }

      toast.success("Image updated successfully");
      setEditImage(null);
      fetchImages(pagination.page);
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteImage) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/uploads/${deleteImage.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Image deleted successfully");
      setDeleteImage(null);
      fetchImages(pagination.page);
    } catch (error) {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyUrl = (url: string) => {
    const fullUrl = `${DOMAIN_CONFIGS.pl.baseUrl}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("URL copied to clipboard");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openEdit = (image: UploadedImage) => {
    setEditImage(image);
    setEditFileName(image.fileName.replace(/\.[^.]+$/, ""));
    setEditPath(image.path === "/" ? "" : image.path);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Uploads</h1>
          <p className="text-gray-500">Manage uploaded images for the site</p>
        </div>
        <div className="flex gap-2">
          {/* НОВА КНОПКА */}
          <Button variant="outline" onClick={() => setIsMultiUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Multiple
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search by filename
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="pathFilter" className="sr-only">
                Filter by path
              </Label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="pathFilter"
                  placeholder="Filter by path..."
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        {pagination.total} image{pagination.total !== 1 ? "s" : ""} total
        {(searchQuery || pathFilter) && " (filtered)"}
      </div>

      {/* Image Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No images uploaded yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload your first image
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="group overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="aspect-square relative bg-gray-100 cursor-pointer"
                onClick={() => setPreviewImage(image)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(image);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(image.url);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(image);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteImage(image);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p
                  className="text-xs font-medium truncate"
                  title={image.fileName}
                >
                  {image.fileName}
                </p>
                <p
                  className="text-xs text-gray-400 truncate"
                  title={image.path}
                >
                  {image.path === "/" ? "/" : `/${image.path}`}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(image.size)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchImages(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchImages(pagination.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Choose a file, set a custom path and filename.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Image File</Label>
              <Input
                id="file"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>

            {uploadPreview && (
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPreview}
                  alt="Upload preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div>
              <Label htmlFor="uploadPath">
                Path{" "}
                <span className="text-gray-400 font-normal">
                  (e.g. products/omron)
                </span>
              </Label>
              <Input
                id="uploadPath"
                placeholder="e.g. products/omron"
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Directory inside the uploads storage. Leave empty for root.
              </p>
            </div>

            <div>
              <Label htmlFor="uploadFileName">
                File Name{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="uploadFileName"
                placeholder="custom-name (extension auto-added)"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to use the original filename.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                resetUploadForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editImage}
        onOpenChange={(open) => {
          if (!open) setEditImage(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Change the filename or move to a different path. The file will be
              moved on disk.
            </DialogDescription>
          </DialogHeader>
          {editImage && (
            <div className="space-y-4">
              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editImage.url}
                  alt={editImage.fileName}
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <Label htmlFor="editFileName">File Name</Label>
                <Input
                  id="editFileName"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Extension will be preserved automatically.
                </p>
              </div>

              <div>
                <Label htmlFor="editPath">Path</Label>
                <Input
                  id="editPath"
                  placeholder="e.g. products/omron"
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditImage(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteImage}
        onOpenChange={(open) => {
          if (!open) setDeleteImage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteImage?.fileName}
              &quot;? This will remove the file from disk and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewImage?.fileName}
            </DialogTitle>
            <DialogDescription>
              Path: /{previewImage?.path} &middot;{" "}
              {previewImage && formatFileSize(previewImage.size)} &middot;{" "}
              {previewImage?.mimeType}
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <div className="w-full max-h-[60vh] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage.url}
                  alt={previewImage.fileName}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyUrl(previewImage.url)}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setPreviewImage(null);
                    openEdit(previewImage);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setPreviewImage(null);
                    setDeleteImage(previewImage);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Модалка для Мультиаплоаду */}
      <Dialog
        open={isMultiUploadOpen}
        onOpenChange={(open) => {
          setIsMultiUploadOpen(open);
          if (!open) {
            setMultiUploadFiles([]);
            setMultiUploadPath("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Multiple Images</DialogTitle>
            <DialogDescription>
              Виберіть кілька файлів для завантаження. Вони будуть збережені з
              їхніми оригінальними іменами.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="multi-file">Images</Label>
              <Input
                id="multi-file"
                type="file"
                multiple // <--- Ключовий атрибут для вибору кількох файлів
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
                onChange={handleMultiFileChange}
                className="mt-1"
                disabled={isUploading}
              />
              {multiUploadFiles.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Вибрано файлів: {multiUploadFiles.length}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="multiUploadPath">
                Path{" "}
                <span className="text-gray-400 font-normal">
                  (e.g. products/gallery)
                </span>
              </Label>
              <Input
                id="multiUploadPath"
                placeholder="e.g. products/gallery"
                value={multiUploadPath}
                onChange={(e) => setMultiUploadPath(e.target.value)}
                className="mt-1"
                disabled={isUploading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Папка для всіх вибраних файлів. Залишіть порожнім для кореневої
                директорії.
              </p>
            </div>

            {/* Прогрес-бар завантаження */}
            {isUploading && multiUploadProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Завантаження...</span>
                  <span>
                    {multiUploadProgress.current} / {multiUploadProgress.total}
                  </span>
                </div>
                {/* Якщо в тебе є компонент Progress з shadcn/ui, можеш юзати його, інакше просто смужка */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(multiUploadProgress.current / multiUploadProgress.total) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMultiUploadOpen(false);
                setMultiUploadFiles([]);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMultiUpload}
              disabled={multiUploadFiles.length === 0 || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
