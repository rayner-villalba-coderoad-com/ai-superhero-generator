import React, { useEffect, useState } from 'react';
import FormInput from './FormInput';
import { TabsNavigationContext } from './TabsNavigationProvider';

type FormData = {
  fullname: string;
  email: string;
  role: string;
  experience: string;
  linkedin: string;
};

const UserProfileFormTab: React.FC = () => {
  const { activeTab, setActiveTab, userData, setUserData } = React.useContext(TabsNavigationContext);
  const [formData, setFormData] = useState<FormData>({
    fullname: '',
    email: '',
    role: '',
    experience: '',
    linkedin: '',
  });

  useEffect(() => {
    setFormData(userData);
  }, [userData]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // In your UserProfileForm:
  const roles = [
    "Data Science Developer",
    "Engineering Product Manager",
    "Fullstack Developer",
    "Mobile Developer Hybrid",
    "Node.js Developer",
    "Professional Services Engineer",
    "QA Automation Engineer",
    "QA Automation Engineer, Senior",
    "Data Engineer",
    "QA Engineer",
    "SQL Engineer",
    "QA Engineer, Junior",
    "Senior Mobile Developer Hybrid, Senior",
    "CloudOps Engineer",
    "Software Developer, Senior",
    "Support Engineer L1",
    "Support Engineer L2",
    "Web Application Developer",
    "Web Application Developer, Junior",
    "Frontend Developer",
    "Data Analyst",
    "Dev JavaScript, Node.js, Python.Core and Python.Web",
    "IT recruiter",
    "SQL Developer",
    "Security /IT",
    "Cybersecurity Compliance Specialist",
    "Cybersecurity Engineer",
    "Network Engineer",
    "Senior Technical Engineer",
    "Senior Technical Support Analyst",
    "Managed Services",
    "Senior Windows Engineer",
    "Senior Backend Developer C#",
    "Backend Developer C#",
    "Java Backend Developer",
    "UX/UI Designer",
    "MX Sales Account Manager",
    "PHP Developer",
    "Technical writer",
    "Business Analyst",
    "HR Generalist",
    "Wordpress Engineer",
    "AI Tech Lead",
    "Customer Advocacy Support Executive",
    "Software Architect",
    "Project Manager",
    "Senior Node Js Developer",
    "Performance Test Engineer",
    "Site Reliability Engineer",
    "DevOps",
    "IOS Developer",
    "IOS Lead",
    "Financial Analyst",
    "Product Owner",
    "Power BI analyst",
    "Tech Lead",
    "IT Recruter Lead",
    "QA Manual",
    "Product Manager",
    "SEO Specialist",
    "IT Support",
    "Golang Software dev",
    "QA Team Lead"
  ];

  const validate = () => {
    const newErrors: any = {};
    if (!formData.fullname) newErrors.fullname = 'Full Name is required.';
    if (!formData.email) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is not valid.';
    }
    if (!formData.role) newErrors.role = 'Role is required.';
    if (formData.experience === '' || +formData.experience < 0) {
      newErrors.experience = 'Please enter a valid number of years.';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      setUserData(formData);
      setTimeout(() => {
        setIsSubmitting(false);
        setActiveTab('photo');
      });
    }
  };

  if (activeTab === 'form') {
    return (
      <div className="mt-6">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md" noValidate>
        
        <FormInput
          id="fullname"
          label="Full Name"
          placeholder="e.g., Rayner Villalba"
          value={formData.fullname}
          onChange={handleChange}
          error={errors.fullname}
        />

        <FormInput
          id="email"
          label="Email"
          type="email"
          placeholder="e.g., rayner.villalba@coderoad.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        <FormInput
          id="role"
          label="Role"
          placeholder="Start typing to see options..."
          value={formData.role}
          onChange={handleChange}
          error={errors.role}
          listId="roles-list" // Give the list a unique ID
          options={roles}      // Pass the array of roles
        />

        <FormInput
          id="experience"
          label="Years of Experience"
          type="number"
          placeholder="e.g., 10"
          value={formData.experience}
          onChange={handleChange}
          error={errors.experience}
        />

        {/* LinkedIn Input Group */}
        <div>
          <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1 text-left">
            LinkedIn Profile
          </label>
          <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <span className="pl-3 text-gray-500">linkedin.com/in/</span>
            <input
              id="linkedin"
              name="linkedin"
              type="text"
              placeholder="username"
              value={formData.linkedin}
              onChange={handleChange}
              className="w-full p-2 border-0 rounded-r-md focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? 'Submitting...' : 'Next'}
        </button>
      </form>
    </div>
    );
  } else {
    return <></>;
  }
}

export default UserProfileFormTab;