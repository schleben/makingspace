import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, SkipBack, CheckCircle } from "lucide-react";

interface VideoPlayerProps {
  videos: any[];
  onComplete: () => void;
}

export default function VideoPlayer({ videos, onComplete }: VideoPlayerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedDuration, setWatchedDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentVideo = videos[currentVideoIndex];

  // Get video progress for current video
  const { data: videoProgress } = useQuery({
    queryKey: ["/api/training/progress", currentVideo?.id],
    enabled: !!currentVideo?.id && !!user,
    retry: false,
  });

  // Update video progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      await apiRequest("POST", "/api/training/progress", progressData);
    },
    onError: (error) => {
      console.error("Error updating progress:", error);
    },
  });

  // Initialize video progress when video or progress data changes
  useEffect(() => {
    if (videoProgress) {
      setWatchedDuration(videoProgress.watchedDuration || 0);
      if (videoRef.current && videoProgress.watchedDuration > 0) {
        videoRef.current.currentTime = videoProgress.watchedDuration;
      }
    } else {
      setWatchedDuration(0);
    }
  }, [currentVideo?.id, videoProgress]);

  // Update progress periodically while playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentVideo && user) {
      interval = setInterval(() => {
        if (videoRef.current) {
          const current = videoRef.current.currentTime;
          setCurrentTime(current);
          
          // Update watched duration if we've progressed further
          if (current > watchedDuration) {
            setWatchedDuration(current);
            
            // Update progress in database every 10 seconds
            if (Math.floor(current) % 10 === 0) {
              const completed = duration > 0 && current >= duration * 0.95; // 95% completion threshold
              
              updateProgressMutation.mutate({
                videoId: currentVideo.id,
                watchedDuration: Math.floor(current),
                completed,
              });
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentVideo, user, watchedDuration, duration]);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    
    // Mark video as completed
    if (currentVideo && user) {
      updateProgressMutation.mutate({
        videoId: currentVideo.id,
        watchedDuration: Math.floor(duration),
        completed: true,
      });
    }

    // Auto-advance to next video or complete training
    if (currentVideoIndex < videos.length - 1) {
      toast({
        title: "Video Complete",
        description: "Moving to next video...",
      });
      setTimeout(() => {
        setCurrentVideoIndex(currentVideoIndex + 1);
      }, 2000);
    } else {
      // All videos completed
      toast({
        title: "Training Complete!",
        description: "You've completed all training videos. Awarding credential...",
      });
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  const goToNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsPlaying(false);
    }
  };

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVideoProgress = () => {
    if (duration === 0) return 0;
    return Math.min((watchedDuration / duration) * 100, 100);
  };

  const isVideoCompleted = (videoIndex: number) => {
    // In a real implementation, you'd check the progress for each video
    return videoIndex < currentVideoIndex;
  };

  if (!currentVideo) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No training videos available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentVideo.title}
                {isVideoCompleted(currentVideoIndex) && (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
              </CardTitle>
              <CardDescription>
                Video {currentVideoIndex + 1} of {videos.length}
                {currentVideo.description && ` • ${currentVideo.description}`}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Video Element */}
          <div className="relative mb-6">
            <video
              ref={videoRef}
              className="w-full h-80 bg-black rounded-lg object-cover"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              poster="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450"
            >
              <source src={currentVideo.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Play/Pause Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                <Button
                  onClick={handlePlay}
                  size="lg"
                  className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-full w-16 h-16"
                >
                  <Play className="w-8 h-8" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Watch Progress</span>
              <span>{Math.round(getVideoProgress())}% complete</span>
            </div>
            <Progress value={getVideoProgress()} className="h-2" />
          </div>

          {/* Video Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousVideo}
                disabled={currentVideoIndex === 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              {isPlaying ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePause}
                >
                  <Pause className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlay}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextVideo}
                disabled={currentVideoIndex === videos.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {currentVideoIndex < videos.length - 1 ? (
                <Button
                  onClick={goToNextVideo}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={getVideoProgress() < 95} // Require 95% completion to proceed
                >
                  Next Video
                </Button>
              ) : (
                <Button
                  onClick={onComplete}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  disabled={getVideoProgress() < 95}
                >
                  Complete Training
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video List */}
      <Card>
        <CardHeader>
          <CardTitle>Training Videos</CardTitle>
          <CardDescription>Complete all videos to earn your credential</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  index === currentVideoIndex
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => setCurrentVideoIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isVideoCompleted(index)
                      ? "bg-success text-success-foreground"
                      : index === currentVideoIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isVideoCompleted(index) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">{video.title}</p>
                    {video.description && (
                      <p className="text-sm text-muted-foreground">{video.description}</p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {video.duration ? formatTime(video.duration) : "N/A"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
