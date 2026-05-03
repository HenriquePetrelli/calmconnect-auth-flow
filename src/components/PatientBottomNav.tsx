import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import ConfirmationModal from '@/components/sos/ConfirmationModal';

/**
 * Mobile/tablet-only bottom navigation for patient routes that don't use MainLayout.
 * Hidden on desktop (lg+). Includes SOS confirmation modal.
 */
const PatientBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const [showSOSModal, setShowSOSModal] = useState(false);

  return (
    <>
      <div className="lg:hidden">
        <BottomNavigation onSOSClick={() => setShowSOSModal(true)} />
      </div>
      <ConfirmationModal
        open={showSOSModal}
        onOpenChange={setShowSOSModal}
        onConfirm={() => {
          setShowSOSModal(false);
          navigate('/sos');
        }}
      />
    </>
  );
};

export default PatientBottomNav;
