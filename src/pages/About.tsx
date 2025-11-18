import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer, Target, Users, Zap, Shield, TrendingUp, Calculator, Package, Linkedin } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <Header variant="landing" />

      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6">{t('about.hero.title')}</h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('about.hero.subtitle')}
          </p>
        </div>

        {/* Mission Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                {t('about.mission.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('about.mission.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.features.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Calculator className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.calculator.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.calculator.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Package className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.inventory.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.inventory.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Printer className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.projects.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.projects.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.dashboard.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.dashboard.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.orders.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.orders.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-4" />
                <CardTitle>{t('about.features.catalogs.title')}</CardTitle>
                <CardDescription>
                  {t('about.features.catalogs.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Values Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.values.title')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Shield className="w-8 h-8 text-primary mb-3" />
                <CardTitle>{t('about.values.security.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('about.values.security.description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-3" />
                <CardTitle>{t('about.values.simplicity.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('about.values.simplicity.description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-8 h-8 text-primary mb-3" />
                <CardTitle>{t('about.values.improvement.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('about.values.improvement.description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-3" />
                <CardTitle>{t('about.values.community.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t('about.values.community.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Creator Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.creator.title')}</h2>
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-16 h-16 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-4">{t('about.creator.name')}</h3>
                  <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                    {t('about.creator.experience')}
                  </p>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {t('about.creator.story1')}
                  </p>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {t('about.creator.story2')}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://www.linkedin.com/in/carlos-peralta-sorolla/', '_blank')}
                      className="gap-2"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="text-2xl mb-2">{t('about.cta.title')}</CardTitle>
              <CardDescription className="text-base">
                {t('about.cta.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                {t('about.cta.createAccount')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                {t('about.cta.viewPlans')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer variant="landing" />
    </div>
  );
};

export default About;

