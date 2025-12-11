import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  MapPin, 
  DollarSign, 
  Clock, 
  Languages, 
  X, 
  Calendar,
  CheckCircle,
  XCircle,
  Award,
  GraduationCap
} from 'lucide-react';
import type { DoctorWithProfile } from '@/types/database';

interface DoctorComparisonProps {
  doctors: DoctorWithProfile[];
  onRemoveDoctor: (doctorId: string) => void;
  onClearAll: () => void;
}

export function DoctorComparison({ doctors, onRemoveDoctor, onClearAll }: DoctorComparisonProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
            ? 'fill-yellow-200 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <div className="h-12 w-12 mx-auto mb-4 opacity-50 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
          <h3 className="text-lg font-medium">No doctors selected for comparison</h3>
          <p className="text-sm">Select up to 3 doctors from the search results to compare them side by side.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Compare Doctors</h2>
          <p className="text-gray-600 text-sm">
            Compare up to 3 doctors side by side to make an informed decision
          </p>
        </div>
        <Button variant="outline" onClick={onClearAll}>
          Clear All
        </Button>
      </div>

      {/* Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-red-100"
              onClick={() => onRemoveDoctor(doctor.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
                  <AvatarFallback>
                    {doctor.user_profile.first_name?.[0]}{doctor.user_profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    Dr. {doctor.user_profile.first_name} {doctor.user_profile.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{doctor.specialization}</p>
                  {doctor.sub_specialization && (
                    <p className="text-xs text-gray-500">{doctor.sub_specialization}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {renderStars(doctor.rating)}
                </div>
                <p className="text-sm">
                  <span className="font-medium">{doctor.rating.toFixed(1)}</span>
                  <span className="text-gray-500 ml-1">({doctor.total_reviews} reviews)</span>
                </p>
              </div>

              <Separator />

              {/* Key Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Experience</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{doctor.years_of_experience || 0} years</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Consultation Fee</span>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>${doctor.consultation_fee}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Accepting Patients</span>
                  <div className="flex items-center">
                    {doctor.is_accepting_patients ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                        <span className="text-green-600">Yes</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1 text-red-600" />
                        <span className="text-red-600">No</span>
                      </>
                    )}
                  </div>
                </div>

                {doctor.office_address && (
                  <div className="text-sm">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600 text-xs leading-relaxed">
                        {doctor.office_address}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Languages */}
              <div>
                <div className="flex items-center mb-2">
                  <Languages className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Languages</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {doctor.languages_spoken.slice(0, 3).map((language) => (
                    <Badge key={language} variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  ))}
                  {doctor.languages_spoken.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{doctor.languages_spoken.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Education & Certifications */}
              {(doctor.education?.length || doctor.certifications?.length) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {doctor.education && doctor.education.length > 0 && (
                      <div>
                        <div className="flex items-center mb-1">
                          <GraduationCap className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Education</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {doctor.education.slice(0, 2).map((edu, index) => (
                            <p key={index}>• {edu}</p>
                          ))}
                          {doctor.education.length > 2 && (
                            <p className="text-gray-500">+{doctor.education.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    {doctor.certifications && doctor.certifications.length > 0 && (
                      <div>
                        <div className="flex items-center mb-1">
                          <Award className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Certifications</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {doctor.certifications.slice(0, 2).map((cert, index) => (
                            <p key={index}>• {cert}</p>
                          ))}
                          {doctor.certifications.length > 2 && (
                            <p className="text-gray-500">+{doctor.certifications.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Bio Preview */}
              {doctor.bio && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {doctor.bio}
                    </p>
                  </div>
                </>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <Button 
                  className="w-full" 
                  size="sm"
                  disabled={!doctor.is_accepting_patients}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Summary */}
      {doctors.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Highest Rated</h4>
                {(() => {
                  const highest = doctors.reduce((prev, current) => 
                    prev.rating > current.rating ? prev : current
                  );
                  return (
                    <p className="text-gray-600">
                      Dr. {highest.user_profile.last_name} ({highest.rating.toFixed(1)} ⭐)
                    </p>
                  );
                })()}
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Most Experienced</h4>
                {(() => {
                  const mostExperienced = doctors.reduce((prev, current) => 
                    (prev.years_of_experience || 0) > (current.years_of_experience || 0) ? prev : current
                  );
                  return (
                    <p className="text-gray-600">
                      Dr. {mostExperienced.user_profile.last_name} ({mostExperienced.years_of_experience || 0} years)
                    </p>
                  );
                })()}
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Most Affordable</h4>
                {(() => {
                  const mostAffordable = doctors.reduce((prev, current) => 
                    prev.consultation_fee < current.consultation_fee ? prev : current
                  );
                  return (
                    <p className="text-gray-600">
                      Dr. {mostAffordable.user_profile.last_name} (${mostAffordable.consultation_fee})
                    </p>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}