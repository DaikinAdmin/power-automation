'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

interface CardWrapperType {
  children: React.ReactNode;
  cardTitle: string;
  cardDescription: string;
  cardFooterLinkTitle?: string;
  cardFooterDescription?: string;
  cardFooterLink?: string;
  className?: string;
  showCloseButton?: boolean;
  closeButtonLink?: string;
}

const CardWrapper = ({
  children,
  cardTitle,
  cardDescription,
  cardFooterLinkTitle = 'Learn More', // Default value
  cardFooterDescription = '',
  cardFooterLink,
  className = '',
  showCloseButton = false,
  closeButtonLink = '/',
}: CardWrapperType) => {
  const locale = useLocale();
  
  return (
    <Card className={`w-[400px] relative ${className} border-2 shadow-md`}>
      {showCloseButton && (
        <Link href={closeButtonLink} className="absolute top-4 right-4 z-10" locale={locale}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </Link>
      )}
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {cardFooterLink && (
        <CardFooter className="flex items-center justify-center gap-x-1">
          {cardFooterDescription && <span>{cardFooterDescription}</span>}
          <Link href={cardFooterLink} className="underline text-blue-500 hover:text-blue-700" locale={locale}>
            {cardFooterLinkTitle}
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default CardWrapper;
